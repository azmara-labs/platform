// Server-safe. Strict parsing of a stored theme config (JSON from a database, a file or an
// import). Everything that can reach CSS is parsed against a fixed pattern, and every unknown key
// is an error, so imported data can never smuggle anything through.
import { type Oklch, parseColour, sameColour } from "./colour.js";
import type { ThemeBranding, ThemeOptions } from "./create-theme.js";
import { parseDensity } from "./preferences.js";
import { FIXED_ROLES, isOverridableRole, type OverridableRole } from "./roles.js";
import { assertFont, assertRadius } from "./validate.js";

type ColourOption =
  | "brand"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "info"
  | "destructive";

/**
 * A theme as stored: what `createTheme` takes, parsed and validated, narrowed to what JSON can
 * hold. Colours are text (never an `{ l, c, h }` object) and there is no `scope`, which is a render
 * option. Every `ThemeConfig` can be passed to `createTheme`.
 */
export interface ThemeConfig extends Omit<ThemeOptions, ColourOption | "light" | "dark" | "scope"> {
  brand?: string;
  primary?: string;
  secondary?: string;
  success?: string;
  warning?: string;
  info?: string;
  destructive?: string;
  light?: Partial<Record<OverridableRole, string>>;
  dark?: Partial<Record<OverridableRole, string>>;
}

/** Large enough for three images at `MAX_DATA_URI_CHARS` plus every role override. */
export const MAX_THEME_JSON_CHARS = 131_072;
/** The longest `data:` image reference. Three of these fit inside `MAX_THEME_JSON_CHARS`. */
export const MAX_DATA_URI_CHARS = 32_768;
/** The largest tint. Above this the greys stop reading as grey. */
export const TINT_MAX = 0.04;
/** What `tint: "brand"` means. */
export const TINT_BRAND = 0.015;

const MAX_TEXT_CHARS = 80;
const MAX_URL_CHARS = 2048;

export class ThemeConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid theme config:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "ThemeConfigError";
    this.issues = issues;
  }
}

type Bag = Record<string, unknown>;

function isPlainObject(value: unknown): value is Bag {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;
const DATA_URI = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * An image reference: an `https:` URL (no credentials) or a small PNG, JPEG or WebP data URI.
 * SVG is refused because it can carry script; a logo that must be SVG is rendered by the app.
 */
export function isAssetRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.startsWith("data:")) return value.length <= MAX_DATA_URI_CHARS && DATA_URI.test(value);
  if (value.length > MAX_URL_CHARS || !PRINTABLE_ASCII.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" && url.hostname !== "" && url.username === "" && url.password === ""
  );
}

/** Whether `key` is present with a value. `undefined` counts as absent, as it does for `createTheme`. */
function present(bag: Bag, key: string): boolean {
  return Object.hasOwn(bag, key) && bag[key] !== undefined;
}

/** Marks and overrides that change the order text is drawn in: ALM, LRM, RLM, LRE..RLO, LRI..PDI. */
function isBidiControl(code: number): boolean {
  return (
    code === 0x061c ||
    code === 0x200e ||
    code === 0x200f ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

function hasControlCharacter(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || (code >= 127 && code <= 159) || isBidiControl(code)) return true;
  }
  return false;
}

/**
 * Short display text such as a theme name: 1 to 80 characters, not blank, and no control or
 * bidirectional formatting characters (they can make a name read differently to how it is stored).
 * Arabic, Hebrew and other right-to-left letters are fine.
 */
export function isDisplayText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_TEXT_CHARS &&
    !hasControlCharacter(value)
  );
}

/** A colour the parser accepts: `#rgb`, `#rrggbb` or `oklch(L C H)`. */
export function isColourString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parseColour(value, "colour");
    return true;
  } catch {
    return false;
  }
}

function checkText(value: unknown, path: string, issues: string[]): value is string {
  if (typeof value !== "string") {
    issues.push(`${path} must be text`);
    return false;
  }
  if (!isDisplayText(value)) {
    issues.push(`${path} must be 1 to ${MAX_TEXT_CHARS} characters with no control characters`);
    return false;
  }
  return true;
}

function checkColour(value: unknown, path: string, issues: string[]): Oklch | undefined {
  if (typeof value !== "string") {
    issues.push(
      `${path} must be a colour string (#rrggbb or oklch(L C H))`, // conventions-ignore: the message names the accepted colour syntax
    );
    return undefined;
  }
  try {
    return parseColour(value, path, "text");
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function check(fn: () => unknown, issues: string[]): void {
  try {
    fn();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
}

const TOP_LEVEL_KEYS = new Set([
  "version",
  "name",
  "brand",
  "primary",
  "secondary",
  "success",
  "warning",
  "info",
  "destructive",
  "tint",
  "light",
  "dark",
  "radius",
  "font",
  "density",
  "branding",
]);
const COLOUR_KEYS = [
  "brand",
  "primary",
  "secondary",
  "success",
  "warning",
  "info",
  "destructive",
] as const;
const BRANDING_KEYS = new Set(["appName", "logo", "logoDark", "favicon"]);

function roleOverrides(
  value: unknown,
  path: string,
  issues: string[],
): Partial<Record<OverridableRole, string>> | undefined {
  if (!isPlainObject(value)) {
    issues.push(`${path} must be an object of role colours`);
    return undefined;
  }
  const out: Partial<Record<OverridableRole, string>> = {};
  for (const key of Object.keys(value)) {
    if ((FIXED_ROLES as readonly string[]).includes(key)) {
      issues.push(`${path}.${key} cannot be overridden`);
    } else if (!isOverridableRole(key)) {
      issues.push(`${path}.${key} is not a theme role`);
    } else if (value[key] !== undefined && checkColour(value[key], `${path}.${key}`, issues)) {
      out[key] = value[key] as string;
    }
  }
  return out;
}

function branding(value: unknown, issues: string[]): ThemeBranding | undefined {
  if (!isPlainObject(value)) {
    issues.push("branding must be an object");
    return undefined;
  }
  const out: ThemeBranding = {};
  for (const key of Object.keys(value)) {
    if (!BRANDING_KEYS.has(key)) {
      issues.push(`branding.${key} is not a known branding field`);
    } else if (value[key] === undefined) {
    } else if (key === "appName") {
      if (checkText(value[key], "branding.appName", issues)) out.appName = value[key] as string;
    } else if (isAssetRef(value[key])) {
      out[key as "logo" | "logoDark" | "favicon"] = value[key] as string;
    } else {
      issues.push(
        `branding.${key} must be an https URL or a PNG, JPEG or WebP data URI (SVG is not accepted)`,
      );
    }
  }
  return out;
}

/** Validate an untrusted value into a theme config, or throw one `ThemeConfigError` with every issue. */
export function parseThemeConfig(input: unknown): ThemeConfig {
  if (!isPlainObject(input)) throw new ThemeConfigError(["a theme config must be an object"]);
  const issues: string[] = [];
  const out: ThemeConfig = {};

  for (const key of Object.keys(input)) {
    if (key === "scope") {
      issues.push('"scope" is a render option and is not part of a stored theme');
    } else if (!TOP_LEVEL_KEYS.has(key)) {
      issues.push(`unknown key "${key}"`);
    }
  }

  if (present(input, "version")) {
    if (input.version === 1) out.version = 1;
    else issues.push("version must be 1");
  }
  if (present(input, "name") && checkText(input.name, "name", issues)) {
    out.name = input.name as string;
  }

  const parsed: Partial<Record<(typeof COLOUR_KEYS)[number], Oklch>> = {};
  for (const key of COLOUR_KEYS) {
    if (!present(input, key)) continue;
    const colour = checkColour(input[key], key, issues);
    if (colour) {
      parsed[key] = colour;
      out[key] = input[key] as string;
    }
  }
  if (parsed.brand && parsed.primary && !sameColour(parsed.brand, parsed.primary)) {
    issues.push("brand and primary are different colours; give only brand");
  }

  if (present(input, "tint")) {
    const { tint } = input;
    if (tint === "brand") out.tint = "brand";
    else if (typeof tint === "number" && Number.isFinite(tint) && tint >= 0 && tint <= TINT_MAX) {
      out.tint = tint;
    } else {
      issues.push(`tint must be "brand" or a number from 0 to ${TINT_MAX}`);
    }
  }

  if (out.tint !== undefined && !present(input, "brand") && !present(input, "primary")) {
    issues.push("tint needs a brand colour to lean toward");
  }

  for (const mode of ["light", "dark"] as const) {
    if (!present(input, mode)) continue;
    const overrides = roleOverrides(input[mode], mode, issues);
    if (overrides) out[mode] = overrides;
  }

  if (present(input, "radius")) {
    if (typeof input.radius !== "string") issues.push("radius must be text such as 0.5rem");
    else check(() => assertRadius(input.radius as string), issues);
    if (typeof input.radius === "string") out.radius = input.radius;
  }
  if (present(input, "font")) {
    if (typeof input.font !== "string") issues.push("font must be a font-family list");
    else check(() => assertFont(input.font as string), issues);
    if (typeof input.font === "string") out.font = input.font;
  }
  if (present(input, "density")) {
    const { density } = input;
    if (typeof density === "string" && parseDensity(density, "comfortable") === density) {
      out.density = density as ThemeConfig["density"];
    } else {
      issues.push("density must be compact, comfortable or spacious");
    }
  }
  if (present(input, "branding")) {
    const value = branding(input.branding, issues);
    if (value) out.branding = value;
  }

  if (issues.length > 0) throw new ThemeConfigError(issues);
  return out;
}

/** Parse theme JSON text. Oversize text is refused before it is parsed. */
export function parseThemeJson(text: string): ThemeConfig {
  if (typeof text !== "string") throw new ThemeConfigError(["theme JSON must be text"]);
  if (text.length > MAX_THEME_JSON_CHARS) {
    throw new ThemeConfigError([`theme JSON is longer than ${MAX_THEME_JSON_CHARS} characters`]);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ThemeConfigError(["theme JSON is not valid JSON"]);
  }
  return parseThemeConfig(value);
}

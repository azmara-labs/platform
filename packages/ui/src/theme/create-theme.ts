// Server-safe. createTheme() turns a brand colour into accessible token overrides
// (replaces MUI's createTheme). Input is validated strictly because the output is CSS.
import {
  clampToGamut,
  contrast,
  contrastOfLuminance,
  format,
  luminance,
  mixedLuminance,
  type Oklch,
  parseColour,
  sameColour,
  shiftUntil,
} from "./colour.js";
import { ThemeConfigError, TINT_MAX } from "./config.js";
import { checkContrast, type ThemeIssue } from "./contrast.js";
import { type Density, type HtmlAttributes, htmlAttributes, parseDensity } from "./preferences.js";
import {
  cssVar,
  isOverridableRole,
  type Mode,
  type OverridableRole,
  ROLE_DEFAULTS,
  ROLES,
  type Role,
} from "./roles.js";
import { TINT_ROLES, tintedRoles, tintValue } from "./tint.js";
import { assertFont, assertRadius, isScope } from "./validate.js";

export type { Oklch };

export interface ThemeOptions {
  /** Brand colour as `#rgb`, `#rrggbb`, `oklch(L C H)` or `{ l, c, h }`. */
  primary?: string | Oklch;
  /** Secondary surfaces (secondary Button, Badge). Same accepted formats as `primary`. */
  secondary?: string | Oklch;
  /**
   * Status colours. Each is derived so its foreground is AA on it in both modes, and so it stays
   * readable as text on the page and on cards (`Text tone`, form errors). `destructive` is the
   * "danger" colour.
   */
  success?: string | Oklch;
  warning?: string | Oklch;
  info?: string | Oklch;
  destructive?: string | Oklch;
  /** `rem` or `px`, e.g. `0.5rem`. */
  radius?: string;
  /** A CSS font-family list, e.g. `Inter, "Segoe UI", sans-serif`. */
  font?: string;
  density?: Density;
  /** Schema version of a stored config. Only `1` exists. `createTheme` ignores it. */
  version?: 1;
  /** A display name for the theme, for editors and exports. `createTheme` ignores it. */
  name?: string;
  /** The brand colour. An alias of `primary`: give one of them. */
  brand?: string | Oklch;
  /** Chroma added to the neutral greys, leaning toward the brand hue. `"brand"` is a light tint. */
  tint?: number | "brand";
  /** Explicit per-role colours for light mode. They replace the derived value for that role. */
  light?: Partial<Record<OverridableRole, string | Oklch>>;
  /** Explicit per-role colours for dark mode. They replace the derived value for that role. */
  dark?: Partial<Record<OverridableRole, string | Oklch>>;
  /** Name and images for the app. `createTheme` ignores it; the shell reads it. */
  branding?: ThemeBranding;
  /** A selector to scope the generated CSS to, instead of `:root`. */
  scope?: string;
}

/** Branding that is not a colour. Images are `https:` URLs or small PNG, JPEG or WebP data URIs. */
export interface ThemeBranding {
  appName?: string;
  logo?: string;
  logoDark?: string;
  favicon?: string;
}

export interface Theme {
  /** Custom properties to set on `:root` (or any ancestor), e.g. via a `style` prop. */
  cssVariables: Record<string, string>;
  /** The same variables as a rule on `:root`, or on `scope` when one is given. */
  css: string;
  /** Attributes for `<html>` (density). */
  htmlAttributes: HtmlAttributes;
}

// ---- derived colours -----------------------------------------------------------------------

const WHITE: Oklch = { l: 0.985, c: 0, h: 0 };
const NEAR_BLACK: Oklch = { l: 0.145, c: 0, h: 0 };
const DARK_CARD: Oklch = { l: 0.205, c: 0, h: 0 };
const WARNING_FOREGROUND: Oklch = { l: 0.25, c: 0.04, h: 70 };
const AA_TEXT = 4.5;
const AA_SURFACE = 4.55; // a little over 4.5:1 so rounding in the output cannot dip below it
const AA_NON_TEXT = 3.2; // a little over 3:1 so rounding in the output cannot dip below it

/** The surfaces a button sits on: the page, and in dark mode also a card. */
const SURFACES: Record<"light" | "dark", Oklch[]> = {
  light: [WHITE],
  dark: [NEAR_BLACK, DARK_CARD],
};

// A button's background blends with what is behind it on hover (`hover:bg-X/90`, secondary `/80`).
// Browsers mix in gamma-encoded sRGB, so a mid-tone colour moves a lot toward white.
const HOVER_ALPHA = 0.9;
const SECONDARY_HOVER_ALPHA = 0.8;

/**
 * Whether `fg` is readable on `bg` at rest AND on `bg` blended at `alpha` over every surface in
 * the mode. This is what keeps a solid button's label readable while the pointer is over it.
 */
function holdsOnHover(
  bg: Oklch,
  fg: Oklch,
  mode: "light" | "dark",
  alpha: number = HOVER_ALPHA,
): boolean {
  if (contrast(bg, fg) < AA_SURFACE) return false;
  return SURFACES[mode].every(
    (surface) =>
      contrastOfLuminance(luminance(fg), mixedLuminance(bg, surface, alpha)) >= AA_SURFACE,
  );
}

/** Light mode: prefer white text (darkening the brand a little if needed), else dark text. */
function lightPair(brand: Oklch, alpha: number = HOVER_ALPHA): { bg: Oklch; fg: Oklch } {
  const withWhite = shiftUntil(brand, -1, 0.12, (c) => holdsOnHover(c, WHITE, "light", alpha));
  if (withWhite) return { bg: withWhite, fg: WHITE };
  const withBlack = shiftUntil(brand, 1, 0.3, (c) => holdsOnHover(c, NEAR_BLACK, "light", alpha));
  if (withBlack) return { bg: withBlack, fg: NEAR_BLACK };
  const forced = shiftUntil(brand, -1, 1, (c) => holdsOnHover(c, WHITE, "light", alpha));
  return { bg: forced ?? clampToGamut({ ...brand, l: 0.2 }), fg: WHITE };
}

/** Dark mode: a lighter primary with dark text. */
function darkPair(brand: Oklch, alpha: number = HOVER_ALPHA): { bg: Oklch; fg: Oklch } {
  const start = clampToGamut({ ...brand, l: Math.min(0.88, Math.max(0.7, brand.l)) });
  const bg = shiftUntil(start, 1, 0.3, (c) => holdsOnHover(c, NEAR_BLACK, "dark", alpha)) ?? start;
  return { bg, fg: NEAR_BLACK };
}

/**
 * A status colour (success, info, destructive) is used twice: as a button or badge surface with
 * its foreground on top, and as TEXT on the page and on cards. So it must satisfy both: in light
 * mode dark enough for white text on it, including on hover (which also makes it readable on
 * white); in dark mode light enough for near-black text on it, including on hover, and readable
 * on the dark page and card.
 */
function statusPair(brand: Oklch, mode: "light" | "dark"): { bg: Oklch; fg: Oklch } {
  if (mode === "light") {
    const bg = shiftUntil(brand, -1, 1, (c) => holdsOnHover(c, WHITE, "light"));
    return { bg: bg ?? clampToGamut({ ...brand, l: 0.2 }), fg: WHITE };
  }
  // Lightness is floored at 0.7, which on its own is more than 6:1 on the dark page and card, so
  // only the near-black label constrains the result.
  const start = clampToGamut({ ...brand, l: Math.min(0.88, Math.max(0.7, brand.l)) });
  const bg = shiftUntil(start, 1, 0.3, (c) => holdsOnHover(c, NEAR_BLACK, "dark"));
  return { bg: bg ?? start, fg: NEAR_BLACK };
}

/**
 * Warning is a bright surface with dark text on it, plus a separate darker colour that is
 * readable as text on the page (a bright yellow is not, on white).
 */
function warningColours(
  brand: Oklch,
  mode: "light" | "dark",
): { bg: Oklch; fg: Oklch; text: Oklch } {
  const start = clampToGamut({ ...brand, l: Math.min(0.9, Math.max(0.7, brand.l)) });
  if (mode === "light") {
    const bg =
      shiftUntil(start, 1, 0.3, (c) => holdsOnHover(c, WARNING_FOREGROUND, "light")) ?? start;
    const text = shiftUntil(brand, -1, 1, (c) => contrast(c, WHITE) >= AA_TEXT);
    return { bg, fg: WARNING_FOREGROUND, text: text ?? clampToGamut({ ...brand, l: 0.2 }) };
  }
  // In dark mode one light colour serves as the surface and as text. The warning foreground is
  // lighter than the page and the card, so clearing it also clears them.
  const both = shiftUntil(start, 1, 0.3, (c) => holdsOnHover(c, WARNING_FOREGROUND, "dark"));
  const colour = both ?? start;
  return { bg: colour, fg: WARNING_FOREGROUND, text: colour };
}

/** Focus ring: the brand hue, shifted until it is visible against every surface. */
function ringFor(brand: Oklch, mode: "light" | "dark"): Oklch {
  const surfaces: Oklch[] =
    mode === "light"
      ? [WHITE]
      : [
          { l: 0.145, c: 0, h: 0 },
          { l: 0.205, c: 0, h: 0 },
        ];
  const start = clampToGamut({
    l: mode === "light" ? Math.min(brand.l, 0.6) : Math.max(brand.l, 0.7),
    c: Math.min(brand.c, 0.18),
    h: brand.h,
  });
  const ok = (c: Oklch) => surfaces.every((s) => contrast(c, s) >= AA_NON_TEXT);
  return shiftUntil(start, mode === "light" ? -1 : 1, 0.6, ok) ?? start;
}

// ---- public API ----------------------------------------------------------------------------

type Resolved = Map<Role, Record<Mode, string>>;

/** Record the light and dark value of a role. Insertion order is the order of the output. */
function setRole(resolved: Resolved, role: Role, light: Oklch, dark: Oklch): void {
  resolved.set(role, { light: format(light), dark: format(dark) });
}

const toLightDark = (value: Record<Mode, string>) => `light-dark(${value.light}, ${value.dark})`;

/** A theme that fails the contrast checks. `issues` names every failing pair. */
export class ThemeContrastError extends Error {
  readonly issues: readonly ThemeIssue[];

  constructor(issues: readonly ThemeIssue[]) {
    super(
      `Theme fails contrast checks:\n${issues.map((issue) => `  - ${issue.message}`).join("\n")}`,
    );
    this.name = "ThemeContrastError";
    this.issues = issues;
  }
}

/** The brand colour option: `primary`, or its alias `brand`. They must agree if both are given. */
function brandOption(options: ThemeOptions): string | Oklch | undefined {
  const { brand, primary } = options;
  if (brand !== undefined && primary !== undefined) {
    if (!sameColour(parseColour(brand, "brand"), parseColour(primary, "primary"))) {
      throw new ThemeConfigError(["brand and primary are different colours; give only brand"]);
    }
  }
  return primary ?? brand;
}

/** Tint the neutral surfaces toward the brand hue. Needs a brand to lean toward. */
function applyTint(resolved: Resolved, options: ThemeOptions, brand: Oklch | undefined): void {
  if (options.tint === undefined) return;
  const amount = tintValue(options.tint);
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > TINT_MAX) {
    throw new ThemeConfigError([`tint must be "brand" or a number from 0 to ${TINT_MAX}`]);
  }
  if (!brand) throw new ThemeConfigError(["tint needs a brand colour to lean toward"]);
  const tinted = tintedRoles(brand, amount);
  for (const role of TINT_ROLES) {
    const value = tinted[role];
    if (value) resolved.set(role, value);
  }
}

/** Explicit per-mode colours. They replace the derived value of that role in that mode only. */
function applyOverrides(resolved: Resolved, options: ThemeOptions): void {
  const issues: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const overrides: unknown = options[mode];
    if (overrides === undefined) continue;
    if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
      issues.push(`${mode} must be an object of role colours`);
      continue;
    }
    for (const [role, value] of Object.entries(overrides)) {
      if (value === undefined) continue;
      if (role === "scrim") issues.push(`${mode}.scrim cannot be overridden`);
      else if (!isOverridableRole(role)) issues.push(`${mode}.${role} is not a theme role`);
      else {
        const colour = parseColour(value as string | Oklch, `${mode}.${role}`);
        const current = resolved.get(role) ?? ROLE_DEFAULTS[role];
        resolved.set(role, { ...current, [mode]: format(colour) });
      }
    }
  }
  if (issues.length > 0) throw new ThemeConfigError(issues);
}

interface Resolution {
  resolved: Resolved;
  issues: ThemeIssue[];
}

/** Derive every role the options ask for, then tint, then apply overrides, then check contrast. */
function resolveTheme(options: ThemeOptions): Resolution {
  const resolved: Resolved = new Map();

  if (options.secondary !== undefined) {
    const brand = parseColour(options.secondary, "secondary");
    const light = lightPair(brand, SECONDARY_HOVER_ALPHA);
    const dark = darkPair(brand, SECONDARY_HOVER_ALPHA);
    setRole(resolved, "secondary", light.bg, dark.bg);
    setRole(resolved, "secondary-foreground", light.fg, dark.fg);
  }
  for (const name of ["success", "info", "destructive"] as const) {
    const input = options[name];
    if (input === undefined) continue;
    const brand = parseColour(input, name);
    const light = statusPair(brand, "light");
    const dark = statusPair(brand, "dark");
    setRole(resolved, name, light.bg, dark.bg);
    setRole(resolved, `${name}-foreground`, light.fg, dark.fg);
  }
  if (options.warning !== undefined) {
    const brand = parseColour(options.warning, "warning");
    const light = warningColours(brand, "light");
    const dark = warningColours(brand, "dark");
    setRole(resolved, "warning", light.bg, dark.bg);
    setRole(resolved, "warning-foreground", light.fg, dark.fg);
    setRole(resolved, "warning-text", light.text, dark.text);
  }
  const brandInput = brandOption(options);
  let brandColour: Oklch | undefined;
  if (brandInput !== undefined) {
    const brand = parseColour(brandInput, options.primary !== undefined ? "primary" : "brand");
    brandColour = brand;
    const light = lightPair(brand);
    const dark = darkPair(brand);
    const ringLight = ringFor(brand, "light");
    const ringDark = ringFor(brand, "dark");
    setRole(resolved, "primary", light.bg, dark.bg);
    setRole(resolved, "primary-foreground", light.fg, dark.fg);
    setRole(resolved, "ring", ringLight, ringDark);
    setRole(resolved, "sidebar-primary", light.bg, dark.bg);
    setRole(resolved, "sidebar-primary-foreground", light.fg, dark.fg);
    setRole(resolved, "sidebar-ring", ringLight, ringDark);
  }

  applyTint(resolved, options, brandColour);
  applyOverrides(resolved, options);

  // Roles nobody set are checked at their defaults, so a pair is always judged as a whole.
  const full: Resolved = new Map(
    ROLES.map((role) => [role, resolved.get(role) ?? ROLE_DEFAULTS[role]] as const),
  );
  return { resolved, issues: checkContrast(full) };
}

/** The selector the CSS is scoped to. Throws a `ThemeConfigError` for one that is not allowed. */
function assertScope(options: ThemeOptions): string {
  const scope = options.scope ?? ":root";
  if (!isScope(scope)) {
    throw new ThemeConfigError([
      'scope must be ":root", one class (.name), one id (#name) or one data attribute ([data-name] or [data-name="value"])',
    ]);
  }
  return scope;
}

/** The options that are not colours: radius, font and density. Throws for one `createTheme` refuses. */
function assertPlainOptions(options: ThemeOptions): {
  radius?: string;
  font?: string;
  density?: Density;
} {
  const out: { radius?: string; font?: string; density?: Density } = {};
  if (options.radius !== undefined) out.radius = assertRadius(options.radius);
  if (options.font !== undefined) out.font = assertFont(options.font);
  if (options.density !== undefined) {
    const density = parseDensity(options.density, "comfortable");
    if (density !== options.density)
      throw new Error(`createTheme: unknown density ${JSON.stringify(options.density)}`);
    out.density = density;
  }
  return out;
}

/**
 * Check a theme without building it: the contrast issues, or an empty list. Throws for options
 * `createTheme` would refuse, so a theme that passes here can be built: a `ThemeConfigError` for a
 * bad colour, an unknown role, a tint without a brand or a scope that is not allowed, and an
 * `Error` for a radius, font or density that is not valid.
 */
export function validateTheme(options: ThemeOptions): ThemeIssue[] {
  assertScope(options);
  const { issues } = resolveTheme(options);
  assertPlainOptions(options);
  return issues;
}

export function createTheme(options: ThemeOptions = {}): Theme {
  const scope = assertScope(options);
  const { resolved, issues } = resolveTheme(options);
  // Contrast is enforced for the new options (tint and overrides). Options that existed before
  // are derived to pass by construction and are covered by their own tests, so they never throw.
  const enforced =
    options.tint !== undefined || options.light !== undefined || options.dark !== undefined;
  if (enforced && issues.length > 0) throw new ThemeContrastError(issues);

  const cssVariables: Record<string, string> = {};
  for (const [role, value] of resolved) cssVariables[cssVar(role)] = toLightDark(value);
  const { radius, font, density } = assertPlainOptions(options);
  if (radius !== undefined) cssVariables["--radius"] = radius;
  if (font !== undefined) cssVariables["--font-sans-stack"] = font;

  const entries = Object.entries(cssVariables);
  const css =
    entries.length === 0
      ? `${scope} {}`
      : `${scope} {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  return { cssVariables, css, htmlAttributes: htmlAttributes({ density }) };
}

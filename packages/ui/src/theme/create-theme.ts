// Server-safe. createTheme() turns a brand colour into accessible token overrides
// (replaces MUI's createTheme). Input is validated strictly because the output is CSS.
import { type Density, type HtmlAttributes, htmlAttributes, parseDensity } from "./preferences.js";

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

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
}

export interface Theme {
  /** Custom properties to set on `:root` (or any ancestor), e.g. via a `style` prop. */
  cssVariables: Record<string, string>;
  /** The same variables as a `:root { ... }` rule. */
  css: string;
  /** Attributes for `<html>` (density). */
  htmlAttributes: HtmlAttributes;
}

// ---- colour maths (OKLCH <-> linear sRGB; Ottosson's OKLab) --------------------------------

const rad = (deg: number) => (deg * Math.PI) / 180;

function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos(rad(h));
  const b = c * Math.sin(rad(h));
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function fromLinearSrgb([r, g, b]: [number, number, number]): Oklch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  return { l: L, c, h: c < 0.0004 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

const EPS = 1e-4;
const inGamut = (color: Oklch) => toLinearSrgb(color).every((v) => v >= -EPS && v <= 1 + EPS);

/** Reduce chroma until the colour fits inside sRGB. */
function clampToGamut(color: Oklch): Oklch {
  let { c } = color;
  while (c > 0 && !inGamut({ ...color, c })) c = Math.max(0, c - 0.004);
  return { ...color, c };
}

const luminance = (color: Oklch) => {
  const [r, g, b] = toLinearSrgb(color).map((v) => Math.min(1, Math.max(0, v))) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const round = (n: number, digits: number) => Number(n.toFixed(digits));
const format = ({ l, c, h }: Oklch) => `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`; // conventions-ignore: this module generates OKLCH colour strings
const lightDark = (light: Oklch, dark: Oklch) => `light-dark(${format(light)}, ${format(dark)})`;

// ---- input parsing -------------------------------------------------------------------------

function fromHex(hex: string): Oklch {
  const digits = hex.length === 3 ? [...hex].map((d) => d + d).join("") : hex;
  const decode = (i: number) => {
    const v = Number.parseInt(digits.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const color = fromLinearSrgb([decode(0), decode(2), decode(4)]);
  return color.c < 0.004 ? { l: color.l, c: 0, h: 0 } : color;
}

/** Parses a colour option. `name` is the option, so an error says which one was wrong. */
function parseColour(input: string | Oklch, name: string): Oklch {
  if (typeof input === "object" && input !== null) {
    const { l, c, h } = input;
    if (![l, c, h].every(Number.isFinite) || l < 0 || l > 1 || c < 0 || c > 0.5) {
      throw new Error(
        `createTheme: ${name} { l, c, h } must be finite, with 0 <= l <= 1 and 0 <= c <= 0.5`,
      );
    }
    return { l, c, h: ((h % 360) + 360) % 360 };
  }
  const text = String(input).trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text);
  if (hex?.[1]) return fromHex(hex[1]);
  const ok = /^oklch\(\s*(\d*\.?\d+)(%?)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:deg)?\s*\)$/i.exec(text);
  if (ok) {
    const l = Number(ok[1]) / (ok[2] ? 100 : 1);
    return parseColour({ l, c: Number(ok[3]), h: Number(ok[4]) }, name);
  }
  throw new Error(
    `createTheme: ${name} must be #rgb, #rrggbb, oklch(L C H) or { l, c, h }; got ${JSON.stringify(text)}`, // conventions-ignore: the message names the accepted colour syntax
  );
}

// ---- derived colours -----------------------------------------------------------------------

const WHITE: Oklch = { l: 0.985, c: 0, h: 0 };
const NEAR_BLACK: Oklch = { l: 0.145, c: 0, h: 0 };
const DARK_CARD: Oklch = { l: 0.205, c: 0, h: 0 };
const WARNING_FOREGROUND: Oklch = { l: 0.25, c: 0.04, h: 70 };
const AA_TEXT = 4.5;
const AA_SURFACE = 4.55; // a little over 4.5:1 so rounding in the output cannot dip below it
const AA_NON_TEXT = 3.2; // a little over 3:1 so rounding in the output cannot dip below it
const STEP = 0.005;

/** The surfaces a button sits on: the page, and in dark mode also a card. */
const SURFACES: Record<"light" | "dark", Oklch[]> = {
  light: [WHITE],
  dark: [NEAR_BLACK, DARK_CARD],
};

// A button's background blends with what is behind it on hover (`hover:bg-X/90`, secondary `/80`).
// Browsers mix in gamma-encoded sRGB, so a mid-tone colour moves a lot toward white.
const HOVER_ALPHA = 0.9;
const SECONDARY_HOVER_ALPHA = 0.8;

const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function encodedSrgb(color: Oklch): [number, number, number] {
  return toLinearSrgb(color).map((v) => encode(Math.min(1, Math.max(0, v)))) as [
    number,
    number,
    number,
  ];
}

/** Luminance of `color` at `alpha` over `surface`, mixed in gamma-encoded sRGB like a browser. */
function mixedLuminance(color: Oklch, surface: Oklch, alpha: number): number {
  const top = encodedSrgb(color);
  const base = encodedSrgb(surface);
  const [r, g, b] = top.map((v, i) => decode(v * alpha + (base[i] as number) * (1 - alpha))) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastOfLuminance(a: number, b: number): number {
  const [hi, lo] = [a, b].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

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

/** Move lightness in one direction until `ok` holds, or give up after `limit`. */
function shiftUntil(
  color: Oklch,
  direction: 1 | -1,
  limit: number,
  ok: (c: Oklch) => boolean,
): Oklch | undefined {
  for (let shift = 0; shift <= limit + 1e-9; shift += STEP) {
    const candidate = clampToGamut({
      ...color,
      l: Math.min(1, Math.max(0, color.l + direction * shift)),
    });
    if (ok(candidate)) return candidate;
  }
  return undefined;
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
  // Lightness starts at 0.7 or more, so a colour that clears near-black also clears the dark card.
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

// ---- validation of the other options -------------------------------------------------------

const RADIUS = /^(?:\d+|\d*\.\d+)(?:rem|px)$/;
const FONT = /^[A-Za-z0-9 ,'"._-]+$/;

function assertRadius(radius: string): string {
  if (!RADIUS.test(radius))
    throw new Error(
      `createTheme: radius must be a number in rem or px, got ${JSON.stringify(radius)}`,
    );
  return radius;
}

function assertFont(font: string): string {
  if (font.length > 200 || !FONT.test(font)) {
    throw new Error(
      "createTheme: font must be a short font-family list (letters, digits, spaces, commas, quotes)",
    );
  }
  return font;
}

// ---- public API ----------------------------------------------------------------------------

export function createTheme(options: ThemeOptions = {}): Theme {
  const cssVariables: Record<string, string> = {};

  if (options.secondary !== undefined) {
    const brand = parseColour(options.secondary, "secondary");
    const light = lightPair(brand, SECONDARY_HOVER_ALPHA);
    const dark = darkPair(brand, SECONDARY_HOVER_ALPHA);
    cssVariables["--secondary"] = lightDark(light.bg, dark.bg);
    cssVariables["--secondary-foreground"] = lightDark(light.fg, dark.fg);
  }
  for (const name of ["success", "info", "destructive"] as const) {
    const input = options[name];
    if (input === undefined) continue;
    const brand = parseColour(input, name);
    const light = statusPair(brand, "light");
    const dark = statusPair(brand, "dark");
    cssVariables[`--${name}`] = lightDark(light.bg, dark.bg);
    cssVariables[`--${name}-foreground`] = lightDark(light.fg, dark.fg);
  }
  if (options.warning !== undefined) {
    const brand = parseColour(options.warning, "warning");
    const light = warningColours(brand, "light");
    const dark = warningColours(brand, "dark");
    cssVariables["--warning"] = lightDark(light.bg, dark.bg);
    cssVariables["--warning-foreground"] = lightDark(light.fg, dark.fg);
    cssVariables["--warning-text"] = lightDark(light.text, dark.text);
  }
  if (options.primary !== undefined) {
    const brand = parseColour(options.primary, "primary");
    const light = lightPair(brand);
    const dark = darkPair(brand);
    const ring = lightDark(ringFor(brand, "light"), ringFor(brand, "dark"));
    cssVariables["--primary"] = lightDark(light.bg, dark.bg);
    cssVariables["--primary-foreground"] = lightDark(light.fg, dark.fg);
    cssVariables["--ring"] = ring;
    cssVariables["--sidebar-primary"] = cssVariables["--primary"];
    cssVariables["--sidebar-primary-foreground"] = cssVariables["--primary-foreground"];
    cssVariables["--sidebar-ring"] = ring;
  }
  if (options.radius !== undefined) cssVariables["--radius"] = assertRadius(options.radius);
  if (options.font !== undefined) cssVariables["--font-sans-stack"] = assertFont(options.font);

  let density: Density | undefined;
  if (options.density !== undefined) {
    density = parseDensity(options.density, "comfortable");
    if (density !== options.density)
      throw new Error(`createTheme: unknown density ${JSON.stringify(options.density)}`);
  }

  const entries = Object.entries(cssVariables);
  const css =
    entries.length === 0
      ? ":root {}"
      : `:root {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  return { cssVariables, css, htmlAttributes: htmlAttributes({ density }) };
}

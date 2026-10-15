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

function parsePrimary(input: string | Oklch): Oklch {
  if (typeof input === "object" && input !== null) {
    const { l, c, h } = input;
    if (![l, c, h].every(Number.isFinite) || l < 0 || l > 1 || c < 0 || c > 0.5) {
      throw new Error(
        "createTheme: primary { l, c, h } must be finite, with 0 <= l <= 1 and 0 <= c <= 0.5",
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
    return parsePrimary({ l, c: Number(ok[3]), h: Number(ok[4]) });
  }
  throw new Error(
    `createTheme: primary must be #rgb, #rrggbb, oklch(L C H) or { l, c, h }; got ${JSON.stringify(text)}`, // conventions-ignore: the message names the accepted colour syntax
  );
}

// ---- derived colours -----------------------------------------------------------------------

const WHITE: Oklch = { l: 0.985, c: 0, h: 0 };
const NEAR_BLACK: Oklch = { l: 0.145, c: 0, h: 0 };
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3.2; // a little over 3:1 so rounding in the output cannot dip below it
const STEP = 0.005;

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
function lightPair(brand: Oklch): { bg: Oklch; fg: Oklch } {
  const withWhite = shiftUntil(brand, -1, 0.12, (c) => contrast(c, WHITE) >= AA_TEXT);
  if (withWhite) return { bg: withWhite, fg: WHITE };
  const withBlack = shiftUntil(brand, 1, 0.3, (c) => contrast(c, NEAR_BLACK) >= AA_TEXT);
  if (withBlack) return { bg: withBlack, fg: NEAR_BLACK };
  const forced = shiftUntil(brand, -1, 1, (c) => contrast(c, WHITE) >= AA_TEXT);
  return { bg: forced ?? clampToGamut({ ...brand, l: 0.2 }), fg: WHITE };
}

/** Dark mode: a lighter primary with dark text. */
function darkPair(brand: Oklch): { bg: Oklch; fg: Oklch } {
  const start = clampToGamut({ ...brand, l: Math.min(0.88, Math.max(0.7, brand.l)) });
  const bg = shiftUntil(start, 1, 0.3, (c) => contrast(c, NEAR_BLACK) >= AA_TEXT) ?? start;
  return { bg, fg: NEAR_BLACK };
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

  if (options.primary !== undefined) {
    const brand = parsePrimary(options.primary);
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

// Server-safe. Colour maths shared by the theme module: OKLCH <-> linear sRGB (Ottosson OKLab),
// gamut clamping, contrast, and strict parsing of colour input (the output is CSS).

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export const STEP = 0.005;

// ---- colour maths (OKLCH <-> linear sRGB; Ottosson's OKLab) --------------------------------

export const rad = (deg: number) => (deg * Math.PI) / 180;

export function toLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
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

export function fromLinearSrgb([r, g, b]: [number, number, number]): Oklch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  return { l: L, c, h: c < 0.0004 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

export const EPS = 1e-4;
export const inGamut = (color: Oklch) =>
  toLinearSrgb(color).every((v) => v >= -EPS && v <= 1 + EPS);

/** Reduce chroma until the colour fits inside sRGB. */
export function clampToGamut(color: Oklch): Oklch {
  let { c } = color;
  while (c > 0 && !inGamut({ ...color, c })) c = Math.max(0, c - 0.004);
  return { ...color, c };
}

export const luminance = (color: Oklch) => {
  const [r, g, b] = toLinearSrgb(color).map((v) => Math.min(1, Math.max(0, v))) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export const round = (n: number, digits: number) => Number(n.toFixed(digits));
export const format = ({ l, c, h }: Oklch) => `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`; // conventions-ignore: this module generates OKLCH colour strings
export const lightDark = (light: Oklch, dark: Oklch) =>
  `light-dark(${format(light)}, ${format(dark)})`;

// ---- input parsing -------------------------------------------------------------------------

export function fromHex(hex: string): Oklch {
  const digits = hex.length === 3 ? [...hex].map((d) => d + d).join("") : hex;
  const decode = (i: number) => {
    const v = Number.parseInt(digits.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const color = fromLinearSrgb([decode(0), decode(2), decode(4)]);
  return color.c < 0.004 ? { l: color.l, c: 0, h: 0 } : color;
}

/** Parses a colour option. `name` is the option, so an error says which one was wrong. */
export function parseColour(input: string | Oklch, name: string): Oklch {
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

/** Move lightness in one direction until `ok` holds, or give up after `limit`. */
export function shiftUntil(
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

/**
 * Whether two parsed colours are the same colour, allowing for rounding in the parse. A grey has
 * no hue, so two greys of the same lightness are the same colour whatever hue they were given.
 */
export const sameColour = (a: Oklch, b: Oklch) =>
  Math.abs(a.l - b.l) < 1e-6 &&
  Math.abs(a.c - b.c) < 1e-6 &&
  (Math.max(a.c, b.c) < 1e-6 || Math.abs(a.h - b.h) < 1e-3);

export const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
export const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

export function encodedSrgb(color: Oklch): [number, number, number] {
  return toLinearSrgb(color).map((v) => encode(Math.min(1, Math.max(0, v)))) as [
    number,
    number,
    number,
  ];
}

/** Luminance of `color` at `alpha` over `surface`, mixed in gamma-encoded sRGB like a browser. */
export function mixedLuminance(color: Oklch, surface: Oklch, alpha: number): number {
  const top = encodedSrgb(color);
  const base = encodedSrgb(surface);
  const [r, g, b] = top.map((v, i) => decode(v * alpha + (base[i] as number) * (1 - alpha))) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastOfLuminance(a: number, b: number): number {
  const [hi, lo] = [a, b].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Contrast of `fg` against `bg` blended at `alpha` over `surface`: what a solid button with
 * `hover:bg-X/90` looks like under the pointer. Browsers mix in gamma-encoded sRGB.
 */
export function blendedContrast(fg: Oklch, bg: Oklch, surface: Oklch, alpha: number): number {
  return contrastOfLuminance(luminance(fg), mixedLuminance(bg, surface, alpha));
}

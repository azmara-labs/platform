// Server-safe. Tinting: every neutral grey leans a few degrees toward the brand hue, so an app
// feels on-brand without coloured panels. Lightness is kept, so contrast is barely affected.
import { clampToGamut, format, type Oklch, parseColour } from "./colour.js";
import { TINT_BRAND } from "./config.js";
import { type Mode, ROLE_DEFAULTS } from "./roles.js";

/**
 * The roles that are tinted. `border`, `input` and `sidebar-border` are not: their dark defaults
 * are transparent. The action colours (primary, secondary, status) come from the brand already.
 */
export const TINT_ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
] as const;

export type TintRole = (typeof TINT_ROLES)[number];

/** Below this chroma a brand has no hue worth following (black, white, greys). */
const MIN_BRAND_CHROMA = 0.02;

/** The chroma a `tint` option means: `"brand"` is the light default. */
export function tintValue(tint: number | "brand"): number {
  return tint === "brand" ? TINT_BRAND : tint;
}

/**
 * The tinted light and dark value of each tint role: the default's lightness, the tint as chroma
 * (clamped into sRGB) and the brand's hue. Returns nothing for a tint of zero or less, and for
 * achromatic brands, whose hue would only add a pink cast.
 */
export function tintedRoles(
  brand: Oklch,
  tint: number,
): Partial<Record<TintRole, Record<Mode, string>>> {
  if (!(tint > 0) || brand.c < MIN_BRAND_CHROMA) return {};
  const tintOne = (value: string): string => {
    const base = parseColour(value, "default");
    return format(clampToGamut({ l: base.l, c: tint, h: brand.h }));
  };
  const out: Partial<Record<TintRole, Record<Mode, string>>> = {};
  for (const role of TINT_ROLES) {
    out[role] = {
      light: tintOne(ROLE_DEFAULTS[role].light),
      dark: tintOne(ROLE_DEFAULTS[role].dark),
    };
  }
  return out;
}

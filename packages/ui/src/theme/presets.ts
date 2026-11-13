// Server-safe. Three ready-made themes, one per way of defining a theme, for a made-up company
// (Harbourline, a freight business with a deep teal brand). They are plain `ThemeConfig` data:
// copy one, change the brand, or use it as it is. Each is checked for contrast in both modes by
// presets.test.ts, and none uses any real company's name or colours.
import type { ThemeConfig } from "./config.js";

const hex = (digits: string) => `#${digits}`; // conventions-ignore: builds the preset hex colours
const ok = (components: string) => `oklch(${components})`; // conventions-ignore: builds the preset oklch colours

const BRAND = hex("0f4c5c");

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const THEME_PRESETS = deepFreeze({
  /** Neutral surfaces. Only buttons, links and focus rings carry the brand. */
  neutral: {
    version: 1,
    name: "Harbourline neutral",
    brand: BRAND,
  },
  /** The same, with every grey leaning a few degrees toward the brand hue. */
  tinted: {
    version: 1,
    name: "Harbourline tinted",
    brand: BRAND,
    tint: "brand",
  },
  /**
   * Branded surfaces: a brand-coloured sidebar in light mode and deep teal surfaces in dark mode.
   * The sidebar is the brand colour, so its active item and focus ring (derived from the brand)
   * are set explicitly, or they would disappear into it.
   */
  branded: {
    version: 1,
    name: "Harbourline branded",
    brand: BRAND,
    light: {
      background: hex("f2f6f7"),
      sidebar: BRAND,
      "sidebar-foreground": hex("ffffff"),
      "sidebar-primary": hex("9ad7e6"),
      "sidebar-primary-foreground": hex("0b3a47"),
      "sidebar-accent": hex("1b6477"),
      "sidebar-accent-foreground": hex("ffffff"),
      "sidebar-ring": hex("9ad7e6"),
    },
    dark: {
      background: ok("0.2 0.03 220"),
      card: ok("0.23 0.035 220"),
      popover: ok("0.23 0.035 220"),
      muted: ok("0.3 0.03 220"),
      accent: ok("0.3 0.04 220"),
      sidebar: ok("0.17 0.03 220"),
      "sidebar-accent": ok("0.28 0.04 220"),
    },
  },
} satisfies Record<string, ThemeConfig>);

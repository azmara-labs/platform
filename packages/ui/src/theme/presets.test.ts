import { parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { parseThemeConfig } from "./config.js";
import { createTheme, validateTheme } from "./create-theme.js";
import { THEME_PRESETS } from "./presets.js";
import { ThemeConfigSchema } from "./schema.js";

type Mode = "light" | "dark";
const NAMES = ["neutral", "tinted", "branded"] as const;

/** One half of a `light-dark(a, b)` value. */
function half(value: string | undefined, mode: Mode): string {
  const match = /^light-dark\((.+), (.+)\)$/.exec(value ?? "");
  if (!match?.[1] || !match[2]) throw new Error(`not a light-dark value: ${value}`);
  return mode === "light" ? match[1] : match[2];
}

/** The value of a role in a built theme, falling back to the token default for roles not set. */
const DEFAULTS: Record<string, Record<Mode, string>> = {
  background: { light: "oklch(1 0 0)", dark: "oklch(0.145 0 0)" },
  foreground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  card: { light: "oklch(1 0 0)", dark: "oklch(0.205 0 0)" },
  "card-foreground": { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  muted: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  "muted-foreground": { light: "oklch(0.5 0 0)", dark: "oklch(0.72 0 0)" },
  sidebar: { light: "oklch(0.985 0 0)", dark: "oklch(0.205 0 0)" },
  "sidebar-foreground": { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  "sidebar-accent": { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  "sidebar-accent-foreground": { light: "oklch(0.205 0 0)", dark: "oklch(0.985 0 0)" },
};

function colour(vars: Record<string, string>, role: string, mode: Mode) {
  const value = vars[`--${role}`] ? half(vars[`--${role}`], mode) : DEFAULTS[role]?.[mode];
  const parsed = value ? parse(value) : undefined;
  if (!parsed) throw new Error(`no ${role} (${mode})`);
  return parsed;
}

describe("THEME_PRESETS", () => {
  it("has exactly the neutral, tinted and branded presets, each named and versioned", () => {
    expect(Object.keys(THEME_PRESETS).sort()).toEqual([...NAMES].sort());
    for (const name of NAMES) {
      expect(THEME_PRESETS[name].version, name).toBe(1);
      expect(THEME_PRESETS[name].name, name).toMatch(/\S/);
    }
  });

  it("parses with parseThemeConfig and with the Zod schema", () => {
    for (const name of NAMES) {
      expect(() => parseThemeConfig(THEME_PRESETS[name]), name).not.toThrow();
      expect(ThemeConfigSchema.safeParse(THEME_PRESETS[name]).success, name).toBe(true);
    }
  });

  it("builds with createTheme without throwing", () => {
    for (const name of NAMES) {
      const theme = createTheme(THEME_PRESETS[name]);
      expect(theme.cssVariables["--primary"], name).toBeDefined();
    }
  });

  it("has no contrast issues in either mode", () => {
    for (const name of NAMES) expect(validateTheme(THEME_PRESETS[name]), name).toEqual([]);
  });

  it("passes the main pairs when checked independently with culori", () => {
    const text: [string, string][] = [
      ["foreground", "background"],
      ["card-foreground", "card"],
      ["muted-foreground", "muted"],
      ["muted-foreground", "background"],
      ["primary-foreground", "primary"],
      ["sidebar-foreground", "sidebar"],
      ["sidebar-accent-foreground", "sidebar-accent"],
    ];
    const ui: [string, string][] = [
      ["ring", "background"],
      ["sidebar-ring", "sidebar"],
      ["sidebar-primary", "sidebar"],
    ];
    for (const name of NAMES) {
      const { cssVariables: vars } = createTheme(THEME_PRESETS[name]);
      for (const mode of ["light", "dark"] as const) {
        for (const [fg, bg] of text) {
          expect(
            wcagContrast(colour(vars, fg, mode), colour(vars, bg, mode)),
            `${name} ${mode} ${fg} on ${bg}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
        for (const [a, b] of ui) {
          expect(
            wcagContrast(colour(vars, a, mode), colour(vars, b, mode)),
            `${name} ${mode} ${a} on ${b}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("neutral changes only the brand-derived variables", () => {
    const keys = Object.keys(createTheme(THEME_PRESETS.neutral).cssVariables);
    expect(keys).toHaveLength(7);
    expect(keys).not.toContain("--background");
  });

  it("tinted adds surface colours and branded sets its own background in each mode", () => {
    expect(createTheme(THEME_PRESETS.tinted).cssVariables["--background"]).toBeDefined();
    const branded = createTheme(THEME_PRESETS.branded).cssVariables["--background"];
    expect(half(branded, "light")).not.toBe(half(branded, "dark"));
    expect(half(branded, "light")).not.toBe("oklch(1 0 0)");
    expect(half(branded, "dark")).not.toBe("oklch(0.145 0 0)");
  });

  it("branded gives the sidebar its own active-item and ring colours, since the sidebar is the brand colour", () => {
    const config = THEME_PRESETS.branded;
    expect(config.light?.["sidebar-primary"]).toBeDefined();
    expect(config.light?.["sidebar-ring"]).toBeDefined();
  });

  it("is frozen, so one app cannot change the presets another app uses", () => {
    expect(Object.isFrozen(THEME_PRESETS)).toBe(true);
    expect(Object.isFrozen(THEME_PRESETS.branded)).toBe(true);
    expect(Object.isFrozen(THEME_PRESETS.branded.light)).toBe(true);
    expect(Object.isFrozen(THEME_PRESETS.branded.dark)).toBe(true);
  });

  it("uses only the Harbourline palette", () => {
    // An allowlist of this made-up company's own colours, so a colour that belongs to a real
    // company cannot slip in. Hex colours must be from the list; oklch colours must be the teal hue.
    const hexAllowed = new Set(["0f4c5c", "f2f6f7", "ffffff", "9ad7e6", "0b3a47", "1b6477"]);
    const text = JSON.stringify(THEME_PRESETS);
    const hexes = [...text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) =>
      (m[1] ?? "").toLowerCase(),
    );
    expect(hexes.length).toBeGreaterThan(5);
    for (const hex of hexes) expect(hexAllowed.has(hex), `#${hex}`).toBe(true);
    const oklchs = [...text.matchAll(/oklch\(([^)]*)\)/g)].map((m) => m[1] ?? "");
    expect(oklchs.length).toBeGreaterThan(3);
    for (const value of oklchs) expect(value.split(" ").at(-1), value).toBe("220");
    expect(Object.values(THEME_PRESETS).every((p) => p.name.startsWith("Harbourline"))).toBe(true);
  });
});

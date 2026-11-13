import { type Oklch as CuloriOklch, displayable, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { parseColour } from "./colour.js";
import { TINT_BRAND, TINT_MAX } from "./config.js";
import { type Mode, ROLE_DEFAULTS } from "./roles.js";
import { TINT_ROLES, tintedRoles, tintValue } from "./tint.js";

const MODES: Mode[] = ["light", "dark"];

// Same brands the createTheme tests use, so tint is exercised on awkward colours too.
const BRANDS = [
  "#1E88E5",
  "#D32F2F",
  "#FBC02D",
  "#2E7D32",
  "#6A1B9A",
  "#607D8B",
  "#0F4C5C",
  "oklch(0.9 0.15 100)",
  "oklch(0.35 0.1 250)",
];
const ACHROMATIC = ["#000000", "#ffffff", "#808080"];

const oklch = (value: string) => {
  const c = parse(value) as CuloriOklch | undefined;
  if (c?.mode !== "oklch") throw new Error(`not oklch: ${value}`);
  return c;
};

describe("tintValue", () => {
  it('maps "brand" to the brand tint and passes numbers through', () => {
    expect(tintValue("brand")).toBe(TINT_BRAND);
    expect(tintValue(0.02)).toBe(0.02);
    expect(tintValue(0)).toBe(0);
  });
});

describe("tintedRoles", () => {
  const brand = parseColour("#0F4C5C", "brand");

  it("tints exactly the listed roles, in both modes", () => {
    const tinted = tintedRoles(brand, 0.03);
    expect(Object.keys(tinted).sort()).toEqual([...TINT_ROLES].sort());
    for (const role of TINT_ROLES) {
      expect(Object.keys(tinted[role] ?? {}).sort(), role).toEqual(["dark", "light"]);
    }
  });

  it("keeps each default's lightness and takes the brand hue", () => {
    const tinted = tintedRoles(brand, 0.03);
    for (const role of TINT_ROLES) {
      for (const mode of MODES) {
        const value = tinted[role]?.[mode] ?? "";
        const result = oklch(value);
        const base = oklch(ROLE_DEFAULTS[role][mode]);
        expect(Math.abs(result.l - base.l), `${role} ${mode} lightness`).toBeLessThan(0.002);
        if (result.c > 0.002) {
          const diff = Math.abs(((result.h ?? 0) - brand.h + 540) % 360) - 180;
          expect(Math.abs(diff), `${role} ${mode} hue`).toBeLessThan(1.5);
        }
      }
    }
  });

  it("skips achromatic brands, with no NaN anywhere", () => {
    for (const hex of ACHROMATIC) {
      const tinted = tintedRoles(parseColour(hex, "brand"), TINT_MAX);
      expect(tinted, hex).toEqual({});
      expect(JSON.stringify(tinted)).not.toContain("NaN");
    }
  });

  it("returns nothing for a tint of zero or less, or NaN", () => {
    expect(tintedRoles(brand, 0)).toEqual({});
    expect(tintedRoles(brand, -0.01)).toEqual({});
    expect(tintedRoles(brand, Number.NaN)).toEqual({});
  });

  it("never tints border, input, sidebar-border, scrim or the action colours", () => {
    const keys = Object.keys(tintedRoles(brand, TINT_MAX));
    for (const role of ["border", "input", "sidebar-border", "scrim", "primary", "ring"]) {
      expect(keys).not.toContain(role);
    }
  });

  it("stays inside sRGB at the maximum tint, for every brand", () => {
    for (const input of BRANDS) {
      const tinted = tintedRoles(parseColour(input, "brand"), TINT_MAX);
      for (const role of TINT_ROLES) {
        for (const mode of MODES) {
          const value = tinted[role]?.[mode];
          expect(value, `${input} ${role} ${mode}`).toBeDefined();
          expect(displayable(oklch(value as string)), `${input} ${role} ${mode}`).toBe(true);
          expect(value).not.toContain("NaN");
        }
      }
    }
  });

  it("keeps the main text pairs at 4.5:1 or better at the maximum tint, for every brand", () => {
    const pairs: [(typeof TINT_ROLES)[number], (typeof TINT_ROLES)[number]][] = [
      ["foreground", "background"],
      ["card-foreground", "card"],
      ["popover-foreground", "popover"],
      ["muted-foreground", "muted"],
      ["muted-foreground", "background"],
      ["accent-foreground", "accent"],
      ["sidebar-foreground", "sidebar"],
      ["sidebar-accent-foreground", "sidebar-accent"],
    ];
    for (const input of BRANDS) {
      const tinted = tintedRoles(parseColour(input, "brand"), TINT_MAX);
      for (const mode of MODES) {
        for (const [fg, bg] of pairs) {
          const ratio = wcagContrast(
            oklch(tinted[fg]?.[mode] as string),
            oklch(tinted[bg]?.[mode] as string),
          );
          expect(ratio, `${input} ${mode} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

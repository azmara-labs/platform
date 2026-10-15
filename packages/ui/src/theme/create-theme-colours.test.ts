import { converter, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { createTheme } from "./create-theme.js";

// Same independent oracle as create-theme.test.ts: every check goes through culori, not through
// the maths under test.
type Mode = "light" | "dark";

function pick(value: string, mode: Mode): string {
  const match = /^light-dark\((.*)\)$/s.exec(value);
  if (!match?.[1]) return value;
  let depth = 0;
  let split = -1;
  for (let i = 0; i < match[1].length; i++) {
    if (match[1][i] === "(") depth++;
    if (match[1][i] === ")") depth--;
    if (match[1][i] === "," && depth === 0) split = i;
  }
  const [light, dark] = [match[1].slice(0, split).trim(), match[1].slice(split + 1).trim()];
  return mode === "light" ? light : dark;
}

function colour(vars: Record<string, string>, name: string, mode: Mode) {
  const value = vars[name];
  if (value === undefined) throw new Error(`${name} missing`);
  const c = parse(pick(value, mode));
  if (!c) throw new Error(`${name} (${mode}) unparseable: ${pick(value, mode)}`);
  return c;
}

const SURFACES: Record<Mode, string[]> = {
  light: ["oklch(1 0 0)"],
  dark: ["oklch(0.145 0 0)", "oklch(0.205 0 0)"],
};

const BRANDS = [
  "#1E88E5",
  "#D32F2F",
  "#FBC02D",
  "#2E7D32",
  "#6A1B9A",
  "#607D8B",
  "#000000",
  "#ffffff",
  "#808080",
  "oklch(0.9 0.15 100)",
  "oklch(0.35 0.1 250)",
];

const MODES: Mode[] = ["light", "dark"];

const textTones = ["success", "info", "destructive"] as const;

describe("createTheme: status and secondary colours stay accessible for any input", () => {
  for (const brand of BRANDS) {
    describe(brand, () => {
      const { cssVariables: vars } = createTheme({
        secondary: brand,
        success: brand,
        warning: brand,
        info: brand,
        destructive: brand,
      });

      for (const mode of MODES) {
        for (const name of ["secondary", "success", "warning", "info", "destructive"]) {
          it(`${mode}: --${name}-foreground on --${name} is >= 4.5:1`, () => {
            const ratio = wcagContrast(
              colour(vars, `--${name}-foreground`, mode),
              colour(vars, `--${name}`, mode),
            );
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          });
        }

        // These colours are also used as TEXT (Text tone, form errors), so they must be readable
        // on the page and on a card, not only as a button surface.
        for (const name of textTones) {
          it(`${mode}: --${name} is readable as text on every surface (>= 4.5:1)`, () => {
            for (const surface of SURFACES[mode]) {
              const ratio = wcagContrast(colour(vars, `--${name}`, mode), surface);
              expect(ratio, `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
          });
        }

        it(`${mode}: --warning-text is readable on every surface (>= 4.5:1)`, () => {
          for (const surface of SURFACES[mode]) {
            const ratio = wcagContrast(colour(vars, "--warning-text", mode), surface);
            expect(ratio, `warning-text on ${surface}`).toBeGreaterThanOrEqual(4.5);
          }
        });
      }
    });
  }
});

describe("createTheme: which variables each colour option sets", () => {
  const cases: [string, string[]][] = [
    ["secondary", ["--secondary", "--secondary-foreground"]],
    ["success", ["--success", "--success-foreground"]],
    ["info", ["--info", "--info-foreground"]],
    ["destructive", ["--destructive", "--destructive-foreground"]],
    ["warning", ["--warning", "--warning-foreground", "--warning-text"]],
  ];

  it.each(cases)("%s sets exactly %j", (option, expected) => {
    const { cssVariables } = createTheme({ [option]: "#2E7D32" });
    expect(Object.keys(cssVariables).sort()).toEqual([...expected].sort());
  });

  it("sets nothing for options that were not given", () => {
    expect(createTheme({ success: "#2E7D32" }).cssVariables["--info"]).toBeUndefined();
    expect(createTheme({}).cssVariables).toEqual({});
  });

  it("combines with primary, radius and the others without conflict", () => {
    const { cssVariables } = createTheme({
      primary: "#1E88E5",
      success: "#2E7D32",
      destructive: "#D32F2F",
      radius: "0.5rem",
    });
    expect(Object.keys(cssVariables)).toEqual(
      expect.arrayContaining([
        "--primary",
        "--success",
        "--success-foreground",
        "--destructive",
        "--destructive-foreground",
        "--radius",
      ]),
    );
  });

  it("is deterministic", () => {
    const a = createTheme({ success: "#2E7D32", warning: "#FBC02D" });
    const b = createTheme({ success: "#2E7D32", warning: "#FBC02D" });
    expect(a).toEqual(b);
  });

  it("emits light-dark() values so the theme follows the mode", () => {
    const { cssVariables } = createTheme({ info: "#1E88E5" });
    expect(cssVariables["--info"]).toMatch(/^light-dark\(oklch\(/);
    expect(cssVariables["--info-foreground"]).toMatch(/^light-dark\(oklch\(/);
  });
});

describe("createTheme: stays faithful to the supplied hue", () => {
  const hueOf = (value: string) => {
    const c = parse(value) as { h?: number; mode: string };
    const oklch = parse(value.replace(/^oklch/, "oklch"));
    return oklch ? (oklch as { h?: number }).h : c.h;
  };

  it.each(["success", "info", "destructive"] as const)("%s keeps its hue in both modes", (name) => {
    const { cssVariables } = createTheme({ [name]: "#2E7D32" });
    for (const mode of MODES) {
      const value = pick(cssVariables[`--${name}`] as string, mode);
      const hue = hueOf(value) as number;
      expect(Math.abs(hue - 145)).toBeLessThan(15); // #2E7D32 is green, around 145 degrees
    }
  });
});

describe("createTheme: colour options reject bad input, naming the option", () => {
  const options = ["secondary", "success", "warning", "info", "destructive"] as const;

  for (const option of options) {
    it(`${option}: rejects values that could inject CSS`, () => {
      for (const bad of [
        "red; background:url(x)",
        "#fff} body{x:y",
        "oklch(0.5 0.1 20) !important",
        "javascript:alert(1)",
        "var(--x)",
        "",
        "#12",
        "rgb(1,2,3)",
      ]) {
        expect(() => createTheme({ [option]: bad }), `${option}: ${bad}`).toThrow(
          new RegExp(`createTheme: ${option} `),
        );
      }
    });

    it(`${option}: rejects out-of-range { l, c, h } objects`, () => {
      expect(() => createTheme({ [option]: { l: 2, c: 0.1, h: 10 } })).toThrow(
        new RegExp(`createTheme: ${option} `),
      );
      expect(() => createTheme({ [option]: { l: 0.5, c: Number.NaN, h: 10 } })).toThrow(
        new RegExp(`createTheme: ${option} `),
      );
    });

    it(`${option}: accepts hex, oklch() and { l, c, h }`, () => {
      expect(() => createTheme({ [option]: "#abc" })).not.toThrow();
      expect(() => createTheme({ [option]: "oklch(0.6 0.15 140)" })).not.toThrow();
      expect(() => createTheme({ [option]: { l: 0.6, c: 0.15, h: 140 } })).not.toThrow();
    });
  }

  it("keeps the primary error message unchanged", () => {
    expect(() => createTheme({ primary: "nope" })).toThrow(/createTheme: primary must be/);
  });

  it("outputs only safe characters in every value", () => {
    const { css } = createTheme({ success: "#2E7D32", warning: "#FBC02D", secondary: "#607D8B" });
    expect(css).not.toMatch(/[<>"'\\]/);
  });
});

// A solid Button lightens or darkens on hover (`hover:bg-X/90`, secondary `/80`: the colour at that
// opacity over the page). A colour that only just clears 4.5:1 at rest can dip below it on hover,
// so derived colours carry a margin. Checked over the page and a card, in both modes, with an
// independent blend.
describe("createTheme: labels stay readable on the hover surface", () => {
  const toRgb = converter("rgb");
  const blend = (surface: string, tint: unknown, alpha: number) => {
    const base = toRgb(parse(surface) as never) as unknown as { r: number; g: number; b: number };
    const top = toRgb(tint as never) as unknown as { r: number; g: number; b: number };
    return {
      mode: "rgb" as const,
      r: base.r * (1 - alpha) + top.r * alpha,
      g: base.g * (1 - alpha) + top.g * alpha,
      b: base.b * (1 - alpha) + top.b * alpha,
    };
  };
  const hover: [string, number][] = [
    ["primary", 0.9],
    ["destructive", 0.9],
    ["success", 0.9],
    ["warning", 0.9],
    ["info", 0.9],
    ["secondary", 0.8],
  ];

  for (const brand of BRANDS) {
    describe(brand, () => {
      for (const [name, alpha] of hover) {
        const { cssVariables: vars } = createTheme({ [name]: brand });
        for (const mode of MODES) {
          it(`${mode}: --${name}-foreground on --${name}/${alpha * 100} is >= 4.5:1`, () => {
            for (const surface of SURFACES[mode]) {
              const tint = colour(vars, `--${name}`, mode);
              const surfaceRgb = parse(surface);
              expect(surfaceRgb).toBeTruthy();
              const rgbTint = parse(pick(vars[`--${name}`] as string, mode));
              const mixed = blend(surface, rgbTint, alpha);
              const ratio = wcagContrast(colour(vars, `--${name}-foreground`, mode), mixed);
              expect(ratio, `${name} hover over ${surface}`).toBeGreaterThanOrEqual(4.5);
              expect(tint).toBeTruthy();
            }
          });
        }
      }
    });
  }
});

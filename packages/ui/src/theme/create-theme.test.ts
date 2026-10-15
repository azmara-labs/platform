import { differenceCiede2000, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { createTheme } from "./create-theme.js";

// Independent oracle: the maths under test lives in create-theme.ts, so all checks here
// go through culori, not through that code.
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
  "#1E88E5", // blue
  "#D32F2F", // red
  "#FBC02D", // yellow
  "#2E7D32", // green
  "#6A1B9A", // purple
  "#607D8B", // blue grey
  "#000000",
  "#ffffff",
  "#808080",
  "oklch(0.9 0.15 100)",
  "oklch(0.35 0.1 250)",
];

describe("createTheme: accessible primary for any brand colour", () => {
  for (const brand of BRANDS) {
    describe(brand, () => {
      const { cssVariables: vars } = createTheme({ primary: brand });

      for (const mode of ["light", "dark"] as const) {
        it(`${mode}: primary-foreground on primary is >= 4.5:1`, () => {
          const ratio = wcagContrast(
            colour(vars, "--primary-foreground", mode),
            colour(vars, "--primary", mode),
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });

        it(`${mode}: sidebar-primary pair is >= 4.5:1`, () => {
          const ratio = wcagContrast(
            colour(vars, "--sidebar-primary-foreground", mode),
            colour(vars, "--sidebar-primary", mode),
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });

        it(`${mode}: focus ring is >= 3:1 on every surface`, () => {
          for (const surface of SURFACES[mode]) {
            const ratio = wcagContrast(
              colour(vars, "--ring", mode),
              parse(surface) as NonNullable<ReturnType<typeof parse>>,
            );
            expect(ratio, `ring on ${surface}`).toBeGreaterThanOrEqual(3);
          }
        });
      }
    });
  }
});

describe("createTheme: stays faithful to the brand", () => {
  it("keeps the hue of a chromatic brand colour in both modes", () => {
    const hueOf = (c: ReturnType<typeof parse>) => (c as { h?: number }).h ?? 0;
    const input = parse("#1E88E5") as NonNullable<ReturnType<typeof parse>>;
    const inputHue = (parse("oklch(0.6 0.15 250)") as { h: number }).h;
    void input;
    const { cssVariables: vars } = createTheme({ primary: "oklch(0.6 0.15 250)" });
    for (const mode of ["light", "dark"] as const) {
      const out = colour(vars, "--primary", mode);
      const dh = Math.abs(((hueOf(out) - inputHue + 540) % 360) - 180);
      expect(dh, `${mode} hue drift`).toBeLessThan(6);
    }
  });

  it("leaves an already accessible light-mode brand colour essentially unchanged", () => {
    const { cssVariables: vars } = createTheme({ primary: "oklch(0.45 0.15 260)" });
    const out = colour(vars, "--primary", "light");
    const de = differenceCiede2000()(
      parse("oklch(0.45 0.15 260)") as NonNullable<ReturnType<typeof parse>>,
      out,
    );
    expect(de).toBeLessThan(1.5);
  });

  it("prefers white text on mid-tone brand colours and dark text on bright ones", () => {
    const blue = createTheme({ primary: "#1E88E5" }).cssVariables;
    const yellow = createTheme({ primary: "#FBC02D" }).cssVariables;
    expect((colour(blue, "--primary-foreground", "light") as { l: number }).l).toBeGreaterThan(0.9);
    expect((colour(yellow, "--primary-foreground", "light") as { l: number }).l).toBeLessThan(0.3);
  });

  it("makes the dark-mode primary lighter than the light-mode one for dark brand colours", () => {
    const { cssVariables: vars } = createTheme({ primary: "oklch(0.35 0.1 250)" });
    const light = colour(vars, "--primary", "light") as { l: number };
    const dark = colour(vars, "--primary", "dark") as { l: number };
    expect(dark.l).toBeGreaterThan(light.l);
  });
});

describe("createTheme: options", () => {
  it("returns no overrides when called with nothing", () => {
    const theme = createTheme();
    expect(theme.cssVariables).toEqual({});
    expect(theme.css).toBe(":root {}");
    expect(theme.htmlAttributes).toEqual({});
  });

  it("emits radius, font and density", () => {
    const theme = createTheme({
      radius: "0.5rem",
      font: 'Inter, "Segoe UI", sans-serif',
      density: "compact",
    });
    expect(theme.cssVariables["--radius"]).toBe("0.5rem");
    expect(theme.cssVariables["--font-sans-stack"]).toBe('Inter, "Segoe UI", sans-serif');
    expect(theme.htmlAttributes).toEqual({ "data-density": "compact" });
  });

  it("renders a :root rule with every variable", () => {
    const { css, cssVariables } = createTheme({ primary: "#1E88E5", radius: "6px" });
    expect(css.startsWith(":root {")).toBe(true);
    for (const [name, value] of Object.entries(cssVariables))
      expect(css).toContain(`${name}: ${value};`);
  });

  it("is deterministic", () => {
    expect(createTheme({ primary: "#1E88E5" })).toEqual(createTheme({ primary: "#1E88E5" }));
  });

  it("accepts an { l, c, h } object", () => {
    const a = createTheme({ primary: { l: 0.45, c: 0.15, h: 260 } });
    const b = createTheme({ primary: "oklch(0.45 0.15 260)" });
    expect(a.cssVariables).toEqual(b.cssVariables);
  });

  it("accepts 3-digit hex", () => {
    expect(createTheme({ primary: "#08f" }).cssVariables["--primary"]).toBeDefined();
  });
});

describe("createTheme: rejects input that could inject CSS", () => {
  const cases: [string, Parameters<typeof createTheme>[0]][] = [
    ["colour with a rule break-out", { primary: "#fff; } body { display: none" }],
    ["colour url()", { primary: "url(https://evil.example/x)" }],
    ["named colour", { primary: "red" }],
    ["hex of the wrong length", { primary: "#12345" }],
    ["NaN lightness", { primary: { l: Number.NaN, c: 0.1, h: 10 } }],
    ["out-of-range lightness", { primary: { l: 4, c: 0.1, h: 10 } }],
    ["radius with a rule break-out", { radius: "4px; } *{display:none" }],
    ["radius with a bad unit", { radius: "4vw" }],
    ["font with a rule break-out", { font: "Inter; } body { x: y" }],
    ["font with markup", { font: "<script>alert(1)</script>" }],
    ["font that is far too long", { font: "a".repeat(400) }],
    ["unknown density", { density: "dense" as never }],
  ];
  it.each(cases)("%s", (_label, options) => {
    expect(() => createTheme(options)).toThrow();
  });
});

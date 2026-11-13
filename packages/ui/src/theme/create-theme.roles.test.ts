import { parse } from "culori";
import { describe, expect, it } from "vitest";
import { ThemeConfigError, TINT_MAX } from "./config.js";
import {
  createTheme,
  ThemeContrastError,
  type ThemeOptions,
  validateTheme,
} from "./create-theme.js";

// Brands that stress the derivation: light, dark, saturated and neutral colours.
const BRANDS = [
  "#1E88E5",
  "#D32F2F",
  "#FBC02D",
  "#2E7D32",
  "#6A1B9A",
  "#607D8B",
  "#0F4C5C",
  "#000000",
  "#ffffff",
  "#808080",
  "oklch(0.9 0.15 100)",
  "oklch(0.35 0.1 250)",
];

/** The two halves of a `light-dark(a, b)` value. */
function halves(value: string | undefined): { light: string; dark: string } {
  const match = /^light-dark\((.+), (.+)\)$/.exec(value ?? "");
  if (!match?.[1] || !match[2]) throw new Error(`not a light-dark value: ${value}`);
  return { light: match[1], dark: match[2] };
}

function failure<T extends Error>(fn: () => unknown, type: new (...args: never[]) => T): T {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(type);
    return error as T;
  }
  throw new Error("expected an error, but nothing was thrown");
}

const BRAND_VARS = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
];

describe("brand and primary", () => {
  it("a brand-only config emits only the brand-derived variables", () => {
    expect(Object.keys(createTheme({ brand: "#0F4C5C" }).cssVariables)).toEqual(BRAND_VARS);
  });

  it("brand and primary give identical output", () => {
    const a = createTheme({ brand: "#0F4C5C" });
    const b = createTheme({ primary: "#0F4C5C" });
    expect(a.cssVariables).toEqual(b.cssVariables);
    expect(a.css).toBe(b.css);
  });

  it("brand and primary that are the same colour are accepted", () => {
    expect(() => createTheme({ brand: "#0F4C5C", primary: "#0f4c5c" })).not.toThrow();
  });

  it("brand and primary that are the same grey are accepted whatever hue they carry", () => {
    expect(() =>
      createTheme({ brand: "oklch(0.6 0 0)", primary: "oklch(0.6 0 200)" }),
    ).not.toThrow();
  });

  it("brand and primary that differ throw a ThemeConfigError", () => {
    failure(() => createTheme({ brand: "#0F4C5C", primary: "#C2410C" }), ThemeConfigError);
  });
});

describe("tint", () => {
  it("adds the surface roles, leaning toward the brand hue", () => {
    const brand = parse("#0F4C5C");
    const { cssVariables } = createTheme({ brand: "#0F4C5C", tint: 0.03 });
    for (const name of ["--background", "--card", "--muted", "--sidebar", "--accent"]) {
      expect(cssVariables[name], name).toBeDefined();
    }
    const light = parse(halves(cssVariables["--muted"]).light);
    expect(light?.mode).toBe("oklch");
    if (light?.mode === "oklch" && brand) {
      expect((light.c ?? 0) > 0.005).toBe(true);
    }
  });

  it('accepts "brand" and the maximum, and adds nothing for a zero tint', () => {
    expect(
      createTheme({ brand: "#0F4C5C", tint: "brand" }).cssVariables["--background"],
    ).toBeDefined();
    expect(
      createTheme({ brand: "#0F4C5C", tint: TINT_MAX }).cssVariables["--background"],
    ).toBeDefined();
    expect(createTheme({ brand: "#0F4C5C", tint: 0 }).cssVariables["--background"]).toBeUndefined();
  });

  it("is skipped for an achromatic brand", () => {
    expect(
      createTheme({ brand: "#808080", tint: "brand" }).cssVariables["--background"],
    ).toBeUndefined();
  });

  it("throws a ThemeConfigError without a brand, or outside the range", () => {
    failure(() => createTheme({ tint: "brand" }), ThemeConfigError);
    failure(() => createTheme({ brand: "#0F4C5C", tint: TINT_MAX + 0.01 }), ThemeConfigError);
    failure(() => createTheme({ brand: "#0F4C5C", tint: Number.NaN }), ThemeConfigError);
    failure(() => createTheme({ brand: "#0F4C5C", tint: -1 }), ThemeConfigError);
  });
});

describe("per-mode overrides", () => {
  it("a dark override leaves the light half at the default", () => {
    const { cssVariables } = createTheme({
      brand: "#0F4C5C",
      dark: { background: "oklch(0.2 0.03 220)" },
    });
    expect(cssVariables["--background"]).toBe("light-dark(oklch(1 0 0), oklch(0.2 0.03 220))");
  });

  it("a light override of a derived role keeps the derived dark half", () => {
    const derived = halves(createTheme({ brand: "#0F4C5C" }).cssVariables["--primary"]);
    const { cssVariables } = createTheme({
      brand: "#0F4C5C",
      light: { primary: "oklch(0.4 0.1 220)" },
    });
    const result = halves(cssVariables["--primary"]);
    expect(result.light).toBe("oklch(0.4 0.1 220)");
    expect(result.dark).toBe(derived.dark);
  });

  it("border keeps its transparent dark default unless overridden", () => {
    const { cssVariables } = createTheme({ brand: "#0F4C5C", light: { border: "#cccccc" } });
    expect(halves(cssVariables["--border"]).dark).toBe("oklch(1 0 0 / 12%)");
    expect(halves(cssVariables["--border"]).light).not.toBe("oklch(0.922 0 0)");
    const both = createTheme({
      brand: "#0F4C5C",
      dark: { border: "oklch(0.4 0.02 220)" },
    }).cssVariables["--border"];
    expect(halves(both).dark).toBe("oklch(0.4 0.02 220)");
  });

  it("overrides work without a brand", () => {
    const { cssVariables } = createTheme({ light: { background: "#f2f6f7" } });
    expect(Object.keys(cssVariables)).toEqual(["--background"]);
  });

  it("rejects scrim and unknown roles with a ThemeConfigError naming the role", () => {
    for (const mode of ["light", "dark"] as const) {
      const scrim = failure(
        () => createTheme({ [mode]: { scrim: "#000000" } } as ThemeOptions),
        ThemeConfigError,
      );
      expect(scrim.issues.join("\n")).toContain("scrim");
      const unknown = failure(
        () => createTheme({ [mode]: { nonsense: "#000000" } } as unknown as ThemeOptions),
        ThemeConfigError,
      );
      expect(unknown.issues.join("\n")).toContain("nonsense");
    }
  });

  it("rejects __proto__ and constructor as role names", () => {
    const hostile = JSON.parse('{"light":{"__proto__":"#fff","constructor":"#fff"}}');
    failure(() => createTheme(hostile), ThemeConfigError);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects hostile colour strings in overrides", () => {
    for (const bad of ["red; } body { display:none", "url(x)", "</style>", "#fff;color:red"]) {
      expect(() => createTheme({ light: { background: bad } }), bad).toThrow();
      expect(() => createTheme({ dark: { "sidebar-accent": bad } }), bad).toThrow();
    }
  });
});

describe("contrast", () => {
  it("an override that fails contrast throws a ThemeContrastError naming role, mode and ratio", () => {
    const error = failure(
      () => createTheme({ brand: "#0F4C5C", light: { foreground: "#ffffff" } }),
      ThemeContrastError,
    );
    const issue = error.issues.find((i) => i.role === "foreground" && i.against === "background");
    expect(issue?.mode).toBe("light");
    expect(error.message).toContain("foreground on background (light)");
    expect(error.message).toContain("needs 4.5:1");
  });

  it("validateTheme returns the same issues without throwing", () => {
    const options: ThemeOptions = { brand: "#0F4C5C", light: { foreground: "#ffffff" } };
    const issues = validateTheme(options);
    expect(issues.some((i) => i.role === "foreground" && i.mode === "light")).toBe(true);
    const thrown = failure(() => createTheme(options), ThemeContrastError);
    expect(thrown.issues).toEqual(issues);
  });

  it("validateTheme refuses the same non-colour options createTheme refuses", () => {
    // An editor that calls only validateTheme must not accept a theme that cannot be built.
    const bad: [string, ThemeOptions][] = [
      ["radius", { brand: "#0F4C5C", radius: "4vw" }],
      ["radius break-out", { brand: "#0F4C5C", radius: "4px; } *{display:none" }],
      ["font", { brand: "#0F4C5C", font: "x; } body { display:none" }],
      ["density", { brand: "#0F4C5C", density: "huge" as never }],
      ["scope", { brand: "#0F4C5C", scope: "body > div" }],
    ];
    for (const [name, options] of bad) {
      expect(() => createTheme(options), `createTheme ${name}`).toThrow();
      expect(() => validateTheme(options), `validateTheme ${name}`).toThrow();
    }
    expect(
      validateTheme({
        brand: "#0F4C5C",
        radius: "0.5rem",
        font: "Inter, sans-serif",
        density: "compact",
        scope: ".app",
      }),
    ).toEqual([]);
  });

  it("validateTheme returns nothing for a sound theme", () => {
    expect(validateTheme({ brand: "#0F4C5C" })).toEqual([]);
    expect(validateTheme({})).toEqual([]);
  });

  it("existing option sets still build for every brand, with no contrast gate", () => {
    for (const brand of BRANDS) {
      expect(() => createTheme({ primary: brand, secondary: brand }), brand).not.toThrow();
    }
  });

  it('tint "brand" gives a theme with no contrast issues for every brand', () => {
    for (const brand of BRANDS) {
      expect(validateTheme({ brand, tint: "brand" }), brand).toEqual([]);
      expect(() => createTheme({ brand, tint: "brand" }), brand).not.toThrow();
    }
  });

  it("the maximum tint gives a theme with no contrast issues for every brand", () => {
    for (const brand of BRANDS) {
      expect(validateTheme({ brand, tint: TINT_MAX }), brand).toEqual([]);
    }
  });
});

describe("output shape", () => {
  it("writes only generated declarations: every line is a custom property", () => {
    const { css } = createTheme({
      brand: "#0F4C5C",
      tint: "brand",
      light: { sidebar: "#0f4c5c", "sidebar-foreground": "#ffffff", "sidebar-ring": "#9ad7e6" },
      dark: { background: "oklch(0.2 0.03 220)" },
      radius: "0.5rem",
      font: "Inter, sans-serif",
    });
    const lines = css.split("\n");
    expect(lines[0]).toBe(":root {");
    expect(lines.at(-1)).toBe("}");
    for (const line of lines.slice(1, -1)) {
      expect(line).toMatch(
        /^ {2}--[a-z-]+: (?:light-dark\(oklch\([^;{}()]*\), oklch\([^;{}()]*\)\)|[^;{}]+);$/,
      );
    }
  });

  it("keeps roles in a stable order with radius and font last", () => {
    const keys = Object.keys(
      createTheme({ brand: "#0F4C5C", tint: "brand", radius: "0.5rem", font: "Inter" })
        .cssVariables,
    );
    expect(keys.slice(-2)).toEqual(["--radius", "--font-sans-stack"]);
    expect(keys.slice(0, BRAND_VARS.length)).toEqual(BRAND_VARS);
  });
});

describe("scope", () => {
  it("replaces :root in the generated css and leaves the variables alone", () => {
    const plain = createTheme({ brand: "#0F4C5C" });
    const scoped = createTheme({ brand: "#0F4C5C", scope: ".org-theme" });
    expect(scoped.cssVariables).toEqual(plain.cssVariables);
    expect(scoped.css.startsWith(".org-theme {\n")).toBe(true);
    expect(scoped.css).not.toContain(":root");
    expect(scoped.css.split("\n").slice(1)).toEqual(plain.css.split("\n").slice(1));
  });

  it("writes an empty rule for an empty theme", () => {
    expect(createTheme({ scope: "#app" }).css).toBe("#app {}");
    expect(createTheme({}).css).toBe(":root {}");
  });

  it("accepts :root, a class, an id and a data attribute", () => {
    for (const scope of [
      ":root",
      ".a",
      ".org-theme_2",
      "#app",
      "[data-org]",
      '[data-org="acme"]',
    ]) {
      expect(() => createTheme({ brand: "#0F4C5C", scope }), scope).not.toThrow();
    }
  });

  it("rejects selectors that could escape the rule or widen its reach", () => {
    const hostile = [
      "}body{display:none",
      ":root,body",
      "a b",
      "",
      "body",
      "html",
      "*",
      ".a.b",
      ".a > .b",
      ".a{",
      ".a;",
      ".a}",
      "</style>",
      "[onclick]",
      '[data-x="a"]x',
      '[data-x="a"], body',
      "[data-x=a]",
      ".1a",
      ".a\nbody",
    ];
    for (const scope of hostile) {
      const error = failure(() => createTheme({ brand: "#0F4C5C", scope }), ThemeConfigError);
      expect(error.issues.join("\n"), JSON.stringify(scope)).toContain("scope");
    }
  });
});

describe("hover", () => {
  it("rejects an override whose label passes at rest but fails when the button is hovered", () => {
    // Find a grey primary that validateTheme flags only for the hover blend, then check that
    // createTheme refuses it with an error that says so.
    let grey: string | undefined;
    for (let l = 0.5; l <= 0.64; l += 0.002) {
      const candidate = `oklch(${l.toFixed(3)} 0 0)`;
      const issues = validateTheme({ brand: "#0F4C5C", light: { primary: candidate } });
      const onlyHover =
        issues.some((i) => i.hover !== undefined) && issues.every((i) => i.hover !== undefined);
      if (onlyHover) {
        grey = candidate;
        break;
      }
    }
    expect(grey, "a primary that fails only on hover exists").toBeDefined();
    const error = failure(
      () => createTheme({ brand: "#0F4C5C", light: { primary: grey } }),
      ThemeContrastError,
    );
    expect(error.message).toMatch(
      /primary-foreground on primary \(light, hovering over background\)/,
    );
  });
});

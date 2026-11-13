import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createTheme,
  htmlAttributes,
  MAX_DATA_URI_CHARS,
  MAX_THEME_JSON_CHARS,
  parseThemeJson,
  ROLES,
  validateTheme,
} from "@azmr/ui/theme";
import { THEME_PRESETS } from "@azmr/ui/theme-presets";
import { oklch, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { parseTokens, splitArgs } from "../scripts/build-tokens";
import { extractExamples, runExample } from "./lib/doc-examples";

// The Theming guide's examples are real code. Each ```ts block with `example=NAME result=VAR` is
// run here and the value of VAR is compared with the JSON on its `// =>` line, so the output the
// docs show is the output the package returns. The claims in the prose are checked below too.

const siteDir = join(import.meta.dirname, "..");
const guide = readFileSync(join(siteDir, "content", "docs", "guide", "theming.mdx"), "utf8");
const tokensCss = readFileSync(
  join(siteDir, "..", "..", "packages", "ui", "src", "styles", "tokens.css"),
  "utf8",
);

const all = extractExamples(guide);

describe("the Theming guide's examples", () => {
  it("finds the examples (guards against scanning nothing)", () => {
    expect(all.map((e) => e.name)).toEqual([
      "brand",
      "light-brand",
      "invalid",
      "tint",
      "override",
      "contrast-error",
      "sidebar-brand",
      "presets",
      "json",
      "json-invalid",
      "css",
      "scope",
      "cookies",
      "cookies-invalid",
      "density",
    ]);
  });

  it.each(all.map((e) => [e.name, e] as const))(
    "%s: shows the output the package returns",
    async (_n, example) => {
      expect(example.expected, `${example.name} has no // => line`).not.toBeUndefined();
      expect(
        await runExample(example, {
          createTheme,
          htmlAttributes,
          validateTheme,
          parseThemeJson,
          THEME_PRESETS,
        }),
      ).toEqual(example.expected);
    },
  );
});

describe("the guide covers the whole theme schema", () => {
  it("names every colour role", () => {
    for (const role of ROLES) expect(guide, role).toContain(`\`${role}\``);
  });

  it("names the two new entry points and the preset demo", () => {
    expect(guide).toContain("@azmr/ui/theme-schema");
    expect(guide).toContain("@azmr/ui/theme-presets");
    expect(guide).toContain('<Demo name="theming/presets" />');
  });

  it("states the size limits the package enforces", () => {
    expect(guide).toContain(MAX_THEME_JSON_CHARS.toLocaleString("en-NZ"));
    expect(guide).toContain(MAX_DATA_URI_CHARS.toLocaleString("en-NZ"));
    expect(guide).not.toContain("16,384");
  });

  it("tells strict Content-Security-Policy users to send a nonced style element", () => {
    expect(guide).toContain("style-src");
    expect(guide).toContain("<style nonce={nonce}>{theme.css}</style>");
  });

  it("warns that a brand-coloured sidebar needs its own ring and active-item colours", () => {
    expect(guide).toContain("sidebar-ring");
    expect(guide).toContain("sidebar-primary");
  });
});

describe("the claims in the guide's prose", () => {
  const tokens = new Map(
    parseTokens(tokensCss)
      .groups.flatMap((g) => g.tokens)
      .map((t) => [t.name, t]),
  );
  const surface = (name: string, mode: "light" | "dark") => {
    const token = tokens.get(name);
    return parse((mode === "light" ? token?.light : token?.dark) ?? token?.value ?? "");
  };
  const half = (value: string, mode: "light" | "dark") => {
    const match = /^light-dark\((.*)\)$/s.exec(value);
    return parse(splitArgs(match?.[1] ?? "")[mode === "light" ? 0 : 1] ?? "");
  };

  const theme = createTheme({ primary: "#1E88E5", radius: "0.5rem" });
  const vars = theme.cssVariables;

  it("keeps the foreground readable on the brand colour in both modes (4.5:1)", () => {
    for (const mode of ["light", "dark"] as const) {
      const fg = half(vars["--primary-foreground"] as string, mode);
      const bg = half(vars["--primary"] as string, mode);
      expect(wcagContrast(fg ?? "", bg ?? "")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the focus ring visible on the page and on cards (3:1)", () => {
    for (const mode of ["light", "dark"] as const) {
      const ring = half(vars["--ring"] as string, mode);
      for (const name of ["--background", "--card"]) {
        expect(wcagContrast(ring ?? "", surface(name, mode) ?? "")).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("makes the light-mode brand colour darker than the one passed in (so white text survives hover)", () => {
    const input = oklch(parse("#1E88E5") ?? "");
    const light = oklch(half(vars["--primary"] as string, "light") ?? "");
    expect(light?.l).toBeLessThan(input?.l ?? 0);
  });

  it("gives a very light brand colour dark text in light mode", () => {
    const yellow = createTheme({ primary: "#FFEB3B" }).cssVariables;
    const fg = oklch(half(yellow["--primary-foreground"] as string, "light") ?? "");
    expect(fg?.l).toBeLessThan(0.3);
  });

  it("names the option in every kind of rejection the guide lists", () => {
    expect(() => createTheme({ radius: "big" })).toThrow(/radius/);
    expect(() => createTheme({ font: "Inter; background: red" })).toThrow(/font/);
    expect(() => createTheme({ density: "huge" as never })).toThrow(/density/);
    expect(() => createTheme({ destructive: "red" })).toThrow(/destructive/);
    expect(() => createTheme({ font: `Inter${"x".repeat(200)}` })).toThrow(/font/);
  });

  it("accepts exactly the font characters the guide lists", () => {
    expect(() =>
      createTheme({ font: `Inter, "Segoe UI", my-font_2.0, 'Noto Sans'` }),
    ).not.toThrow();
    for (const bad of ["Inter;", "Inter{}", "Inter()", "Inter/*", "Inter\\", "Inter<"]) {
      expect(() => createTheme({ font: bad }), bad).toThrow(/font/);
    }
  });

  it("only accepts the colour formats the guide lists", () => {
    expect(() => createTheme({ primary: "#abc" })).not.toThrow();
    expect(() => createTheme({ primary: "#aabbcc" })).not.toThrow();
    expect(() => createTheme({ primary: "oklch(0.5 0.1 200)" })).not.toThrow();
    expect(() => createTheme({ primary: { l: 0.5, c: 0.1, h: 200 } })).not.toThrow();
    expect(() => createTheme({ primary: "rgb(1, 2, 3)" })).toThrow(/primary/);
  });

  it("uses selectors and attributes that tokens.css really defines", () => {
    for (const selector of [
      ".dark",
      ".light",
      '[data-theme="dark"]',
      '[data-theme="light"]',
      '[data-density="compact"]',
      '[data-density="spacious"]',
      'data-motion="essential"',
      "prefers-reduced-motion: reduce",
    ]) {
      expect(tokensCss, selector).toContain(selector);
    }
  });

  it("collapses the motion durations to 0.01ms and the stagger step to 0ms under reduced motion", () => {
    for (const name of ["instant", "fast", "base", "slow", "ambient"]) {
      expect(tokens.get(`--motion-duration-${name}`)?.reduced, name).toBe("0.01ms");
    }
    expect(tokens.get("--motion-stagger-step")?.reduced).toBe("0ms");
  });

  it("emits a density attribute only for compact and spacious", () => {
    expect(createTheme({ density: "spacious" }).htmlAttributes).toEqual({
      "data-density": "spacious",
    });
    expect(createTheme({}).htmlAttributes).toEqual({});
  });
});

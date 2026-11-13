import { describe, expect, it } from "vitest";
import {
  isAssetRef,
  MAX_DATA_URI_CHARS,
  MAX_THEME_JSON_CHARS,
  parseThemeConfig,
  parseThemeJson,
  type ThemeConfig,
  ThemeConfigError,
  TINT_BRAND,
  TINT_MAX,
} from "./config.js";
import type { ThemeOptions } from "./create-theme.js";
import { ROLES } from "./roles.js";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

/** Run `fn`, require a ThemeConfigError, and return it. */
function failure(fn: () => unknown): ThemeConfigError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ThemeConfigError);
    return error as ThemeConfigError;
  }
  throw new Error("expected ThemeConfigError, but nothing was thrown");
}

describe("constants", () => {
  it("pins the limits the spec fixes", () => {
    expect(MAX_THEME_JSON_CHARS).toBe(131_072);
    expect(MAX_DATA_URI_CHARS).toBe(32_768);
    expect(TINT_MAX).toBe(0.04);
    expect(TINT_BRAND).toBe(0.015);
  });
});

describe("parseThemeConfig: valid input", () => {
  it("accepts a minimal config", () => {
    expect(parseThemeConfig({ version: 1, brand: "#1D4E89" })).toEqual({
      version: 1,
      brand: "#1D4E89",
    });
  });

  it("accepts every field", () => {
    const full = {
      version: 1,
      name: "Harbourline",
      brand: "#0F4C5C",
      secondary: "oklch(0.6 0.1 200)",
      success: "#2E7D32",
      warning: "#FBC02D",
      info: "#1E88E5",
      destructive: "#D32F2F",
      tint: "brand",
      light: { background: "#f2f6f7", sidebar: "#0f4c5c" },
      dark: { background: "oklch(0.18 0.03 220)", "primary-foreground": "#101418" },
      radius: "0.5rem",
      font: "Inter, system-ui, sans-serif",
      density: "compact",
      branding: { appName: "Harbourline", logo: "https://example.com/logo.png", favicon: PNG },
    };
    expect(parseThemeConfig(full)).toEqual(full);
  });

  it("accepts brand and primary when they are the same colour", () => {
    expect(() => parseThemeConfig({ brand: "#1D4E89", primary: "#1d4e89" })).not.toThrow();
  });

  it("treats greys as the same colour whatever hue they carry", () => {
    expect(() =>
      parseThemeConfig({ brand: "oklch(0.6 0 0)", primary: "oklch(0.6 0 200)" }),
    ).not.toThrow();
    expect(() =>
      parseThemeConfig({ brand: "oklch(0.6 0 0)", primary: "oklch(0.7 0 200)" }),
    ).toThrow(ThemeConfigError);
    expect(() =>
      parseThemeConfig({ brand: "oklch(0.6 0.1 0)", primary: "oklch(0.6 0.1 200)" }),
    ).toThrow(ThemeConfigError);
  });

  it("accepts tint as a number from 0 to the maximum, or as brand", () => {
    for (const tint of [0, 0.01, TINT_MAX, "brand"]) {
      expect(() => parseThemeConfig({ brand: "#1D4E89", tint })).not.toThrow();
    }
  });
});

describe("ThemeConfig type", () => {
  it("holds only what JSON can hold: colour text, and no scope", () => {
    // These are compile-time checks: `tsc` fails on an unused directive if the type is too wide.
    // @ts-expect-error a stored config holds colour text, never an { l, c, h } object
    const object: ThemeConfig = { brand: { l: 0.5, c: 0.1, h: 20 } };
    // @ts-expect-error scope is a render option, not part of a stored theme
    const scoped: ThemeConfig = { scope: ":root" };
    // @ts-expect-error role overrides are colour text too
    const override: ThemeConfig = { light: { background: { l: 1, c: 0, h: 0 } } };
    expect([object, scoped, override]).toHaveLength(3);
  });

  it("can be passed to createTheme as it is", () => {
    const config: ThemeConfig = parseThemeConfig({
      brand: "#1D4E89",
      light: { background: "#fff" },
    });
    const options: ThemeOptions = config;
    expect(options.brand).toBe("#1D4E89");
  });
});

describe("parseThemeConfig: strictness", () => {
  it("rejects unknown keys at every level", () => {
    const top = failure(() => parseThemeConfig({ brand: "#fff", extra: 1 }));
    expect(top.issues.join("\n")).toContain("extra");
    const light = failure(() => parseThemeConfig({ brand: "#fff", light: { nope: "#fff" } }));
    expect(light.issues.join("\n")).toContain("nope");
    const branding = failure(() => parseThemeConfig({ brand: "#fff", branding: { nope: "x" } }));
    expect(branding.issues.join("\n")).toContain("nope");
  });

  it("rejects scope, which is a render option and not part of a stored theme", () => {
    const error = failure(() => parseThemeConfig({ brand: "#fff", scope: ":root" }));
    expect(error.issues.join("\n")).toContain("scope");
  });

  it("rejects scrim overrides in either mode", () => {
    for (const mode of ["light", "dark"]) {
      const error = failure(() => parseThemeConfig({ brand: "#fff", [mode]: { scrim: "#000" } }));
      expect(error.issues.join("\n")).toContain("scrim");
    }
  });

  it("rejects a version other than 1", () => {
    for (const version of [2, 0, "1", null]) {
      failure(() => parseThemeConfig({ brand: "#fff", version }));
    }
  });

  it("rejects arrays, null and non-object roots", () => {
    for (const root of [[], null, undefined, "x", 1, true]) {
      failure(() => parseThemeConfig(root));
    }
    failure(() => parseThemeConfig({ brand: "#fff", light: [] }));
    failure(() => parseThemeConfig({ brand: "#fff", branding: null }));
    failure(() => parseThemeConfig({ brand: "#fff", dark: "#000" }));
  });

  it("rejects non-string colours in a stored config", () => {
    failure(() => parseThemeConfig({ brand: 123 }));
    failure(() => parseThemeConfig({ brand: { l: 0.5, c: 0.1, h: 20 } }));
    failure(() => parseThemeConfig({ brand: "#fff", light: { background: { l: 1, c: 0, h: 0 } } }));
    failure(() => parseThemeConfig({ brand: "#fff", dark: { background: null } }));
  });

  it("rejects brand and primary that disagree", () => {
    failure(() => parseThemeConfig({ brand: "#1D4E89", primary: "#C2410C" }));
  });

  it("rejects an unknown density", () => {
    failure(() => parseThemeConfig({ brand: "#fff", density: "huge" }));
  });

  it("rejects tint outside 0 to the maximum, NaN, Infinity and other strings", () => {
    for (const tint of [
      -0.01,
      TINT_MAX + 0.001,
      1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "yes",
      "0.02",
    ]) {
      failure(() => parseThemeConfig({ brand: "#1D4E89", tint }));
    }
  });

  it("collects every issue in one error", () => {
    const error = failure(() =>
      parseThemeConfig({ brand: "nope", radius: "big", font: "a;b", tint: 9, extra: true }),
    );
    expect(error.issues.length).toBeGreaterThanOrEqual(5);
  });
});

describe("parseThemeConfig: injection", () => {
  const HOSTILE = [
    "red; } body { display:none",
    "url(https://evil.example/x)",
    "expression(alert(1))",
    "</style><script>alert(1)</script>",
    '"); x: y',
    "#fff;color:red",
    "a\nb",
  ];

  it("rejects hostile strings in every colour field", () => {
    for (const bad of HOSTILE) {
      for (const field of ["brand", "secondary", "success", "warning", "info", "destructive"]) {
        failure(() => parseThemeConfig({ [field]: bad }));
      }
      failure(() => parseThemeConfig({ brand: "#fff", light: { background: bad } }));
      failure(() => parseThemeConfig({ brand: "#fff", dark: { "sidebar-accent": bad } }));
    }
  });

  it("rejects hostile strings in radius and font", () => {
    for (const bad of HOSTILE) {
      failure(() => parseThemeConfig({ brand: "#fff", radius: bad }));
      failure(() => parseThemeConfig({ brand: "#fff", font: bad }));
    }
  });

  it("rejects bidirectional control characters in name and appName, but keeps Arabic and Hebrew text", () => {
    // These reorder the text around them, so a name can read differently to how it is stored.
    const bidi = ["؜", "‎", "‏", "‪", "‫", "‬", "‭", "‮"];
    for (const mark of [...bidi, "⁦", "⁧", "⁨", "⁩"]) {
      failure(() => parseThemeConfig({ brand: "#fff", name: `Acme${mark}Ltd` }));
      failure(() => parseThemeConfig({ brand: "#fff", branding: { appName: `Acme${mark}Ltd` } }));
    }
    for (const fine of ["مؤسسة أزمارا", "אזמרה", "Azmara مؤسسة"]) {
      expect(() => parseThemeConfig({ brand: "#fff", name: fine })).not.toThrow();
    }
  });

  it("rejects control characters and over-long text in name and appName", () => {
    for (const bad of ["a\u0000b", "a\nb", "", "   ", "x".repeat(81)]) {
      failure(() => parseThemeConfig({ brand: "#fff", name: bad }));
      failure(() => parseThemeConfig({ brand: "#fff", branding: { appName: bad } }));
    }
  });
});

describe("asset references", () => {
  it("accepts an https url and a png, jpeg or webp data uri", () => {
    expect(isAssetRef("https://example.com/logo.png")).toBe(true);
    expect(isAssetRef(PNG)).toBe(true);
    expect(isAssetRef("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(isAssetRef("data:image/webp;base64,UklGRg==")).toBe(true);
  });

  it("rejects svg, script and plain-http references", () => {
    for (const bad of [
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      "data:image/svg+xml,<svg/>",
      "data:text/html;base64,PGgxPg==",
      "javascript:alert(1)",
      "http://example.com/logo.png",
      "https://user:pw@example.com/logo.png",
      "//example.com/logo.png",
      "/logo.png",
      "https://",
      "https://example.com/a b",
      "https://example.com/\u0000",
      "",
      42,
      null,
      {},
    ]) {
      expect(isAssetRef(bad), String(bad)).toBe(false);
    }
  });

  it("enforces the size caps", () => {
    expect(isAssetRef(`https://example.com/${"a".repeat(2048)}`)).toBe(false);
    expect(isAssetRef(`data:image/png;base64,${"A".repeat(102_400)}`)).toBe(false);
  });

  it("is applied to logo, logoDark and favicon", () => {
    for (const field of ["logo", "logoDark", "favicon"]) {
      failure(() =>
        parseThemeConfig({ brand: "#fff", branding: { [field]: "javascript:alert(1)" } }),
      );
    }
  });
});

describe("parseThemeJson", () => {
  it("parses a valid config", () => {
    expect(parseThemeJson('{"version":1,"brand":"#1D4E89"}')).toEqual({
      version: 1,
      brand: "#1D4E89",
    });
  });

  it("rejects oversize text before parsing it, even when it is valid JSON", () => {
    const text = JSON.stringify({ brand: "#fff", name: "x".repeat(MAX_THEME_JSON_CHARS) });
    expect(text.length).toBeGreaterThan(MAX_THEME_JSON_CHARS);
    const error = failure(() => parseThemeJson(text));
    expect(error.message).toContain(String(MAX_THEME_JSON_CHARS));
  });

  it("rejects text that is not JSON, and non-string input", () => {
    failure(() => parseThemeJson("{not json"));
    failure(() => parseThemeJson(undefined as unknown as string));
  });

  it("rejects __proto__ and constructor keys without polluting anything", () => {
    failure(() => parseThemeJson('{"brand":"#1D4E89","__proto__":{"polluted":true}}'));
    failure(() => parseThemeJson('{"brand":"#1D4E89","light":{"__proto__":"#fff"}}'));
    failure(() => parseThemeJson('{"brand":"#1D4E89","light":{"constructor":"#fff"}}'));
    failure(() => parseThemeJson('{"brand":"#1D4E89","branding":{"__proto__":"x"}}'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("turns very deep nesting into a ThemeConfigError, not a crash", () => {
    const deep = "[".repeat(8000) + "]".repeat(8000);
    failure(() => parseThemeJson(deep));
    failure(() => parseThemeJson(`{"brand":"#fff","light":${deep}}`));
  });
});

describe("stored themes must be readable", () => {
  it("fits three maximum-size images and every role override inside the JSON limit", () => {
    expect(3 * MAX_DATA_URI_CHARS + 8192).toBeLessThanOrEqual(MAX_THEME_JSON_CHARS);
  });

  it("round-trips the largest valid config through JSON text", () => {
    const image = `data:image/png;base64,${"A".repeat(MAX_DATA_URI_CHARS - "data:image/png;base64,".length)}`;
    expect(image.length).toBe(MAX_DATA_URI_CHARS);
    const everyRole = Object.fromEntries(
      ROLES.filter((role) => role !== "scrim").map((role) => [role, "oklch(0.5 0.1 200)"]),
    );
    const largest = parseThemeConfig({
      version: 1,
      name: "x".repeat(80),
      brand: "#1D4E89",
      light: everyRole,
      dark: everyRole,
      branding: { appName: "x".repeat(80), logo: image, logoDark: image, favicon: image },
    });
    const text = JSON.stringify(largest);
    expect(text.length).toBeLessThanOrEqual(MAX_THEME_JSON_CHARS);
    expect(parseThemeJson(text)).toEqual(largest);
  });

  it("accepts an image exactly at the cap and rejects one character over", () => {
    const prefix = "data:image/png;base64,";
    expect(isAssetRef(prefix + "A".repeat(MAX_DATA_URI_CHARS - prefix.length))).toBe(true);
    expect(isAssetRef(prefix + "A".repeat(MAX_DATA_URI_CHARS - prefix.length + 1))).toBe(false);
  });
});

describe("undefined means absent", () => {
  it("skips undefined values for known keys, at every level", () => {
    const parsed = parseThemeConfig({
      version: undefined,
      name: undefined,
      brand: "#1D4E89",
      secondary: undefined,
      tint: undefined,
      light: { background: undefined, foreground: "#111111" },
      dark: { background: undefined },
      radius: undefined,
      font: undefined,
      density: undefined,
      branding: { appName: "Harbourline", logo: undefined },
    });
    expect(parsed).toEqual({
      brand: "#1D4E89",
      light: { foreground: "#111111" },
      dark: {},
      branding: { appName: "Harbourline" },
    });
    expect("secondary" in parsed).toBe(false);
    expect("version" in parsed).toBe(false);
  });

  it("still rejects an unknown key even when its value is undefined", () => {
    failure(() => parseThemeConfig({ brand: "#1D4E89", extra: undefined }));
  });
});

describe("tint needs a brand", () => {
  it("rejects tint without brand or primary, so every accepted theme can be built", () => {
    const error = failure(() => parseThemeConfig({ tint: "brand" }));
    expect(error.issues.join("\n")).toContain("tint needs a brand colour");
    failure(() => parseThemeConfig({ tint: 0.02, light: { background: "#fff" } }));
    failure(() => parseThemeConfig({ tint: "brand", brand: undefined }));
  });

  it("accepts tint with brand, and with the primary alias", () => {
    expect(() => parseThemeConfig({ tint: "brand", brand: "#1D4E89" })).not.toThrow();
    expect(() => parseThemeConfig({ tint: 0.02, primary: "#1D4E89" })).not.toThrow();
  });
});

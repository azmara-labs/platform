// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fieldsFromSchema } from "../components/zod/index.js";
import { parseThemeConfig } from "./config.js";
import { ThemeConfigSchema } from "./schema.js";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const HOSTILE = [
  "red; } body { display:none",
  "url(https://evil.example/x)",
  "expression(alert(1))",
  "</style><script>alert(1)</script>",
  "#fff;color:red",
  "a\nb",
];

/** One table, fed to both validators. They must agree on every row. */
const FIXTURES: [name: string, input: unknown][] = [
  // valid
  ["minimal", { version: 1, brand: "#1D4E89" }],
  ["no version", { brand: "#1D4E89" }],
  ["empty object", {}],
  ["primary alias", { primary: "#1D4E89" }],
  ["brand and primary equal", { brand: "#1D4E89", primary: "#1d4e89" }],
  ["brand and primary the same grey", { brand: "oklch(0.6 0 0)", primary: "oklch(0.6 0 200)" }],
  ["oklch brand", { brand: "oklch(0.35 0.1 250)" }],
  [
    "all colours",
    {
      brand: "#0F4C5C",
      secondary: "#222",
      success: "#2E7D32",
      warning: "#FBC02D",
      info: "#1E88E5",
      destructive: "#D32F2F",
    },
  ],
  ["tint brand", { brand: "#0F4C5C", tint: "brand" }],
  ["tint zero", { brand: "#0F4C5C", tint: 0 }],
  ["tint max", { brand: "#0F4C5C", tint: 0.04 }],
  [
    "overrides",
    {
      brand: "#0F4C5C",
      light: { background: "#f2f6f7", sidebar: "#0f4c5c" },
      dark: { background: "oklch(0.2 0.03 220)" },
    },
  ],
  ["empty overrides", { brand: "#0F4C5C", light: {}, dark: {} }],
  ["radius font density", { radius: "0.5rem", font: "Inter, sans-serif", density: "compact" }],
  ["name", { name: "Harbourline" }],
  [
    "branding",
    {
      branding: {
        appName: "Harbourline",
        logo: "https://example.com/logo.png",
        logoDark: PNG,
        favicon: PNG,
      },
    },
  ],
  // invalid
  ["unknown top-level key", { brand: "#fff", extra: 1 }],
  ["scope is not stored", { brand: "#fff", scope: ":root" }],
  ["unknown role", { light: { nonsense: "#fff" } }],
  ["scrim override (light)", { light: { scrim: "#000" } }],
  ["scrim override (dark)", { dark: { scrim: "#000" } }],
  ["unknown branding key", { branding: { nope: "x" } }],
  ["version 2", { version: 2 }],
  ["version as text", { version: "1" }],
  ["brand and primary differ", { brand: "#1D4E89", primary: "#C2410C" }],
  ["colour as number", { brand: 123 }],
  ["colour as object", { brand: { l: 0.5, c: 0.1, h: 20 } }],
  ["override as object", { light: { background: { l: 1, c: 0, h: 0 } } }],
  ["override as null", { dark: { background: null } }],
  ["light as array", { light: [] }],
  ["light as text", { light: "#000" }],
  ["branding as null", { branding: null }],
  ["tint too high", { brand: "#fff", tint: 0.041 }],
  ["tint negative", { brand: "#fff", tint: -0.01 }],
  ["tint NaN", { brand: "#fff", tint: Number.NaN }],
  ["tint Infinity", { brand: "#fff", tint: Number.POSITIVE_INFINITY }],
  ["tint text", { brand: "#fff", tint: "0.02" }],
  ["bad density", { density: "huge" }],
  ["radius in em", { radius: "1em" }],
  ["name blank", { name: "   " }],
  ["name too long", { name: "x".repeat(81) }],
  ["name with control character", { name: "a\u0000b" }],
  ["appName too long", { branding: { appName: "x".repeat(81) } }],
  ["svg logo", { branding: { logo: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" } }],
  ["http logo", { branding: { logo: "http://example.com/logo.png" } }],
  ["javascript logo", { branding: { favicon: "javascript:alert(1)" } }],
  ["logo with credentials", { branding: { logo: "https://user:pw@example.com/logo.png" } }],
  ["null root", null],
  ["array root", []],
  ["text root", "brand"],
  ["number root", 42],
  ...HOSTILE.flatMap((bad): [string, unknown][] => [
    [`hostile brand ${JSON.stringify(bad)}`, { brand: bad }],
    [`hostile override ${JSON.stringify(bad)}`, { light: { background: bad } }],
    [`hostile radius ${JSON.stringify(bad)}`, { radius: bad }],
    [`hostile font ${JSON.stringify(bad)}`, { font: bad }],
    [`hostile name ${JSON.stringify(bad)}`, { name: bad }],
  ]),
  // undefined means absent (form libraries produce these)
  ["undefined colour", { brand: "#1D4E89", secondary: undefined }],
  ["undefined version", { version: undefined }],
  ["undefined name", { name: undefined }],
  ["undefined override", { light: { background: undefined } }],
  ["undefined branding image", { branding: { logo: undefined } }],
  [
    "undefined everywhere",
    { brand: undefined, tint: undefined, light: undefined, dark: undefined, branding: undefined },
  ],
  ["unknown key set to undefined", { brand: "#1D4E89", extra: undefined }],
  // tint needs a brand to lean toward
  ["tint without a brand", { tint: "brand" }],
  [
    "invalid brand beside a valid primary (safeParse must not throw)",
    { brand: "#fff;", primary: "#1D4E89" },
  ],
  ["tint with an undefined brand", { tint: 0.02, brand: undefined }],
  ["tint with brand", { tint: "brand", brand: "#1D4E89" }],
  ["tint with primary", { tint: 0.02, primary: "#1D4E89" }],
  // keys that only exist in parsed JSON
  ["__proto__ key", JSON.parse('{"brand":"#1D4E89","__proto__":{"polluted":true}}')],
  ["__proto__ role", JSON.parse('{"light":{"__proto__":"#fff"}}')],
  ["constructor role", JSON.parse('{"dark":{"constructor":"#fff"}}')],
];

const accepts = (validator: () => unknown) => {
  try {
    validator();
    return true;
  } catch {
    return false;
  }
};

describe("ThemeConfigSchema", () => {
  it("is a server-safe module (no window, no document)", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(ThemeConfigSchema.safeParse({ brand: "#1D4E89" }).success).toBe(true);
  });

  it("guards against an all-valid or all-invalid fixture table", () => {
    const valid = FIXTURES.filter(([, input]) => accepts(() => parseThemeConfig(input)));
    expect(valid.length).toBeGreaterThanOrEqual(12);
    expect(FIXTURES.length - valid.length).toBeGreaterThanOrEqual(30);
  });

  it("agrees with parseThemeConfig on every fixture", () => {
    for (const [name, input] of FIXTURES) {
      const expected = accepts(() => parseThemeConfig(input));
      const actual = ThemeConfigSchema.safeParse(input).success;
      expect(actual, name).toBe(expected);
    }
  });

  it("returns the same data as parseThemeConfig for the valid fixtures", () => {
    for (const [name, input] of FIXTURES) {
      if (!accepts(() => parseThemeConfig(input))) continue;
      const parsed = ThemeConfigSchema.safeParse(input);
      expect(parsed.success, name).toBe(true);
      expect(parsed.data, name).toEqual(parseThemeConfig(input));
    }
  });

  it("gives every field a label and help text", () => {
    const fields = fieldsFromSchema(ThemeConfigSchema);
    expect(fields.length).toBeGreaterThanOrEqual(15);
    for (const field of fields) {
      expect(field.label, field.name).not.toBe("");
      expect(field.label, `${field.name} label is only the key`).not.toBe(
        field.name.charAt(0).toUpperCase() + field.name.slice(1),
      );
      expect(typeof field.meta?.help, `${field.name} help`).toBe("string");
    }
  });

  it("describes the fields a generated form needs", () => {
    const byName = new Map(fieldsFromSchema(ThemeConfigSchema).map((f) => [f.name, f]));
    expect(byName.get("brand")?.label).toBe("Brand colour");
    expect(byName.get("radius")?.type).toBe("text");
    expect(byName.get("density")).toMatchObject({
      type: "enum",
      options: ["compact", "comfortable", "spacious"],
    });
    expect(byName.get("brand")?.required).toBe(false);
  });
});

// The fixture table only holds cases someone thought of. This pass builds thousands of inputs from
// valid and invalid fragments with a fixed seed, so the schema and the parser are compared on
// combinations nobody wrote down. JSON-compatible values only (plus undefined, which forms send).
describe("ThemeConfigSchema, generated parity", () => {
  const random = (seed: number) => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const roleFragments: unknown[] = [
    {},
    { background: "#f2f6f7" },
    { background: "oklch(0.2 0.03 220)", sidebar: "#0F4C5C" },
    { scrim: "#000" },
    { nonsense: "#fff" },
    { background: undefined },
    { background: 5 },
    [],
    "x",
    undefined,
  ];
  const POOL: Record<string, unknown[]> = {
    version: [1, 2, "1", undefined],
    name: ["Harbourline", "", "   ", "x".repeat(81), 5, undefined],
    brand: ["#1D4E89", "oklch(0.5 0.1 200)", "red", 12, "#fff;", undefined],
    primary: ["#1D4E89", "#C2410C", "red", undefined],
    secondary: ["#222", "bad", undefined],
    success: ["#2E7D32", "nope", undefined],
    tint: ["brand", 0, 0.04, 0.05, -1, Number.NaN, "x", undefined],
    light: roleFragments,
    dark: roleFragments,
    radius: ["0.5rem", "1em", 5, undefined],
    font: ["Inter, sans-serif", "a;b", undefined],
    density: ["compact", "comfortable", "huge", undefined],
    branding: [
      {},
      { appName: "A" },
      { logo: "https://example.com/l.png" },
      { logo: "http://x.example/l.png" },
      { favicon: "data:image/png;base64,iVBORw0KGgo=" },
      { logo: undefined },
      { nope: 1 },
      null,
    ],
    extra: [1, undefined],
  };

  it("agrees with parseThemeConfig on 4000 generated inputs", () => {
    const next = random(20261114);
    const keys = Object.keys(POOL);
    let valid = 0;
    for (let i = 0; i < 4000; i++) {
      const input: Record<string, unknown> = {};
      for (const key of keys) {
        if (next() < 0.3) {
          const options = POOL[key] as unknown[];
          input[key] = options[Math.floor(next() * options.length)];
        }
      }
      const expected = accepts(() => parseThemeConfig(input));
      if (expected) valid++;
      expect(ThemeConfigSchema.safeParse(input).success, JSON.stringify(input)).toBe(expected);
    }
    // Neither all valid nor all invalid, or the comparison would prove nothing.
    expect(valid).toBeGreaterThan(300);
    expect(valid).toBeLessThan(3700);
  });
});

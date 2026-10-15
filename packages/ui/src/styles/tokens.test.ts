import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Color,
  differenceCiede2000,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  parse,
  wcagContrast,
} from "culori";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const cssPath = join(import.meta.dirname, "tokens.css");
const css = readFileSync(cssPath, "utf8");
const root = postcss.parse(css);

type Mode = "light" | "dark";

/** Declarations of every rule whose selector list contains `selector`. */
function declsFor(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  root.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls((d) => {
      out.set(d.prop, d.value.trim());
    });
  });
  return out;
}

const rootVars = declsFor(":root");

/** Split a function's argument list on top-level commas. */
function splitArgs(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts;
}

/** Resolve a token for a colour mode, following `light-dark()` and `var()`. */
function resolve(name: string, mode: Mode, vars = rootVars): string {
  const raw = vars.get(name);
  if (raw === undefined) throw new Error(`token ${name} is not defined in :root`);
  const ld = /^light-dark\((.*)\)$/s.exec(raw);
  if (ld?.[1]) {
    const [light, dark] = splitArgs(ld[1]);
    return (mode === "light" ? light : dark) as string;
  }
  const v = /^var\((--[\w-]+)\)$/.exec(raw);
  if (v?.[1]) return resolve(v[1], mode, vars);
  return raw;
}

function colour(name: string, mode: Mode): Color {
  const value = resolve(name, mode);
  const c = parse(value);
  if (!c) throw new Error(`token ${name} (${mode}) is not a parseable colour: ${value}`);
  return c;
}

const MODES: Mode[] = ["light", "dark"];

describe("required tokens (shadcn-compatible names)", () => {
  const required = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "border",
    "input",
    "ring",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
    // Azmara extensions
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "info",
    "info-foreground",
  ];
  it.each(required)("defines --%s", (name) => {
    expect(rootVars.has(`--${name}`), `--${name}`).toBe(true);
  });

  it("defines --radius", () => {
    expect(rootVars.get("--radius")).toMatch(/rem$/);
  });

  it("defines eight chart colours", () => {
    for (let i = 1; i <= 8; i++) expect(rootVars.has(`--chart-${i}`), `--chart-${i}`).toBe(true);
  });
});

describe("colour modes", () => {
  it("follows the system by default and can be forced with a class or data-theme", () => {
    expect(rootVars.get("color-scheme")).toBe("light dark");
    expect(declsFor(".dark").get("color-scheme")).toBe("dark");
    expect(declsFor('[data-theme="dark"]').get("color-scheme")).toBe("dark");
    expect(declsFor(".light").get("color-scheme")).toBe("light");
    expect(declsFor('[data-theme="light"]').get("color-scheme")).toBe("light");
  });

  it("uses only oklch colours (no raw hex / rgb / hsl) in token values", () => {
    const offenders: string[] = [];
    root.walkDecls((d) => {
      if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(d.value))
        offenders.push(`${d.prop}: ${d.value}`);
    });
    expect(offenders).toEqual([]);
  });
});

// `light-dark()` in :root is enough for the page-level theme, but a bundler that lowers it (Next's
// CSS pipeline does, for older browser targets) turns every token into `var(--toggle-light, a)
// var(--toggle-dark, b)`. A custom property that references var() is resolved where it is
// declared (:root) and inherited as a fixed value, so a nested `data-theme="light"` inside a dark
// page could not change it. Each scope therefore re-declares every colour token explicitly,
// which works however the CSS is processed. These tests keep the copies in sync with :root.
describe("scoped themes re-declare every colour token (nesting survives lowering)", () => {
  const colourTokens = [...rootVars].filter(([, v]) => v.startsWith("light-dark(")).map(([n]) => n);
  const scopes: [string, Mode][] = [
    [".light", "light"],
    ['[data-theme="light"]', "light"],
    [".dark", "dark"],
    ['[data-theme="dark"]', "dark"],
  ];

  it("finds the colour tokens (guards against checking nothing)", () => {
    expect(colourTokens.length).toBeGreaterThanOrEqual(40);
  });

  it.each(scopes)("%s declares every colour token with its own mode's value", (selector, mode) => {
    const decls = declsFor(selector);
    const wrong = colourTokens.filter((name) => decls.get(name) !== resolve(name, mode));
    expect(wrong).toEqual([]);
  });

  it("keeps the class and attribute selectors identical (one rule each)", () => {
    expect([...declsFor(".dark")]).toEqual([...declsFor('[data-theme="dark"]')]);
    expect([...declsFor(".light")]).toEqual([...declsFor('[data-theme="light"]')]);
  });

  it("still sets color-scheme, so native widgets and light-dark() follow the scope", () => {
    expect(declsFor(".dark").get("color-scheme")).toBe("dark");
    expect(declsFor(".light").get("color-scheme")).toBe("light");
  });
});

describe("WCAG contrast of token pairs (text >= 4.5:1)", () => {
  const textPairs: [string, string][] = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "muted"],
    ["muted-foreground", "background"],
    ["accent-foreground", "accent"],
    ["destructive-foreground", "destructive"],
    ["success-foreground", "success"],
    ["warning-foreground", "warning"],
    ["info-foreground", "info"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-primary-foreground", "sidebar-primary"],
    ["sidebar-accent-foreground", "sidebar-accent"],
  ];
  for (const mode of MODES) {
    it.each(textPairs)(`${mode}: --%s on --%s`, (fg, bg) => {
      const ratio = wcagContrast(colour(`--${fg}`, mode), colour(`--${bg}`, mode));
      expect(ratio, `${fg} on ${bg} (${mode})`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

// Semantic colours used as TEXT on a page or card (Text tone="destructive", form errors, status
// copy). `--warning` is a yellow surface colour and `--warning-foreground` is the dark text that
// goes ON it, so neither reads as text on the page in both modes: `--warning-text` exists for that.
describe("semantic tone colours as text on the page (>= 4.5:1)", () => {
  const tones = ["destructive", "success", "warning-text", "info"];
  const surfaces = ["background", "card"];
  for (const mode of MODES) {
    for (const tone of tones) {
      for (const surface of surfaces) {
        it(`${mode}: --${tone} on --${surface}`, () => {
          const ratio = wcagContrast(colour(`--${tone}`, mode), colour(`--${surface}`, mode));
          expect(ratio, `${tone} on ${surface} (${mode})`).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  it("warning text is readable where the surface-pair foreground is not (the reason the token exists)", () => {
    // --warning-foreground is near-black in both modes: fine on a warning surface, unreadable as
    // text on the dark page.
    const darkPage = colour("--background", "dark");
    expect(wcagContrast(colour("--warning-foreground", "dark"), darkPage)).toBeLessThan(4.5);
    expect(wcagContrast(colour("--warning-text", "dark"), darkPage)).toBeGreaterThanOrEqual(4.5);
  });

  it("is mapped into the Tailwind theme as text-warning-text", () => {
    expect(css).toContain("--color-warning-text: var(--warning-text);");
  });
});

describe("WCAG 2.2 non-text contrast (>= 3:1)", () => {
  for (const mode of MODES) {
    it(`${mode}: focus ring is visible on the page and on cards`, () => {
      for (const surface of ["background", "card", "popover"]) {
        const ratio = wcagContrast(colour("--ring", mode), colour(`--${surface}`, mode));
        expect(ratio, `ring on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe("chart palette", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  for (const mode of MODES) {
    it(`${mode}: every series has >= 3:1 contrast against the page and card surfaces`, () => {
      for (const i of ids) {
        for (const surface of ["background", "card"]) {
          const ratio = wcagContrast(colour(`--chart-${i}`, mode), colour(`--${surface}`, mode));
          expect(ratio, `chart-${i} on ${surface} (${mode})`).toBeGreaterThanOrEqual(3);
        }
      }
    });

    const sims: [string, (c: Color) => Color | undefined, number][] = [
      ["normal vision", (c) => c, 12],
      ["protanopia", filterDeficiencyProt(1) as (c: Color) => Color, 6],
      ["deuteranopia", filterDeficiencyDeuter(1) as (c: Color) => Color, 6],
      ["tritanopia", filterDeficiencyTrit(1) as (c: Color) => Color, 6],
    ];
    for (const [label, simulate, min] of sims) {
      it(`${mode}: all pairs differ by >= ${min} CIEDE2000 under ${label}`, () => {
        const de = differenceCiede2000();
        const seen = ids.map((i) => simulate(colour(`--chart-${i}`, mode)) as Color);
        for (let a = 0; a < seen.length; a++) {
          for (let b = a + 1; b < seen.length; b++) {
            const d = de(seen[a] as Color, seen[b] as Color);
            expect(
              d,
              `chart-${a + 1} vs chart-${b + 1} (${label}, ${mode})`,
            ).toBeGreaterThanOrEqual(min);
          }
        }
      });
    }
  }
});

describe("motion tokens", () => {
  it("defines durations and easings", () => {
    for (const d of ["instant", "fast", "base", "slow"]) {
      expect(rootVars.get(`--motion-duration-${d}`), `duration ${d}`).toMatch(/^\d+(\.\d+)?ms$/);
    }
    for (const e of ["standard", "emphasized", "decelerate", "accelerate"]) {
      expect(rootVars.get(`--motion-ease-${e}`), `ease ${e}`).toMatch(/^cubic-bezier\(/);
    }
  });

  it("durations increase from instant to slow", () => {
    const ms = ["instant", "fast", "base", "slow"].map((d) =>
      Number.parseFloat(rootVars.get(`--motion-duration-${d}`) ?? "NaN"),
    );
    expect([...ms].sort((a, b) => a - b)).toEqual(ms);
  });

  it("collapses every duration token under prefers-reduced-motion", () => {
    let collapsed: Map<string, string> | undefined;
    root.walkAtRules("media", (at) => {
      if (!/prefers-reduced-motion:\s*reduce/.test(at.params)) return;
      at.walkRules(":root", (rule) => {
        collapsed = new Map();
        rule.walkDecls((d) => {
          collapsed?.set(d.prop, d.value.trim());
        });
      });
    });
    expect(collapsed, "a :root rule inside @media (prefers-reduced-motion: reduce)").toBeDefined();
    for (const d of ["instant", "fast", "base", "slow"]) {
      expect(collapsed?.get(`--motion-duration-${d}`), `reduced ${d}`).toBe("0.01ms");
    }
  });

  it("has a global reduced-motion safety net that spares essential motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/:not\(\[data-motion=["']essential["']\]\)/);
  });
});

describe("density, elevation and layering tokens", () => {
  const densityProps = ["control-height", "control-padding-x", "gap", "row-height"];
  it("has comfortable defaults on :root", () => {
    for (const p of densityProps) expect(rootVars.has(`--density-${p}`), p).toBe(true);
  });

  it("compact is tighter and spacious is looser than comfortable, on every property", () => {
    const compact = declsFor('[data-density="compact"]');
    const spacious = declsFor('[data-density="spacious"]');
    const rem = (v: string | undefined) => Number.parseFloat(v ?? "NaN");
    for (const p of densityProps) {
      const base = rem(rootVars.get(`--density-${p}`));
      expect(rem(compact.get(`--density-${p}`)), `compact ${p}`).toBeLessThan(base);
      expect(rem(spacious.get(`--density-${p}`)), `spacious ${p}`).toBeGreaterThan(base);
    }
  });

  it("keeps the compact control height at or above the WCAG 2.2 minimum target (24px)", () => {
    expect(
      Number.parseFloat(
        declsFor('[data-density="compact"]').get("--density-control-height") ?? "0",
      ) * 16,
    ).toBeGreaterThanOrEqual(24);
  });

  it("defines four elevation levels and an ordered z-index scale", () => {
    for (let i = 1; i <= 4; i++)
      expect(rootVars.has(`--elevation-${i}`), `elevation-${i}`).toBe(true);
    const z = ["dropdown", "sticky", "overlay", "modal", "popover", "toast", "tooltip"].map((n) =>
      Number(rootVars.get(`--z-${n}`)),
    );
    expect(z.every(Number.isFinite)).toBe(true);
    expect([...z].sort((a, b) => a - b)).toEqual(z);
  });
});

describe("Tailwind v4 integration", () => {
  it("maps every colour token into the theme with @theme inline", () => {
    let mapped = new Set<string>();
    root.walkAtRules("theme", (at) => {
      if (at.params.trim() !== "inline") return;
      at.walkDecls((d) => {
        if (d.prop.startsWith("--color-")) mapped.add(d.prop.slice("--color-".length));
      });
    });
    expect(mapped.size).toBeGreaterThan(0);
    const colourTokens = [...rootVars.keys()].filter(
      (k) =>
        /^--(?!radius|motion|density|elevation|z-)[\w-]+$/.test(k) &&
        k !== "--color-scheme" &&
        rootVars.get(k)?.includes("oklch"),
    );
    for (const token of colourTokens) {
      const name = token.slice(2);
      expect(mapped.has(name), `--color-${name} missing from @theme inline`).toBe(true);
    }
    mapped = new Set();
  });

  it("tells Tailwind to scan the distributed classes with @source", () => {
    expect(css).toMatch(/@source\s+["'][^"']+["']/);
  });
});

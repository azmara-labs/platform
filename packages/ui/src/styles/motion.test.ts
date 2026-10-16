import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { describe, expect, it } from "vitest";
import { motionPresets } from "../motion/presets/presets.js";

const css = readFileSync(join(import.meta.dirname, "motion.css"), "utf8");
const root = postcss.parse(css);
const stylesCss = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");
const tokensCss = readFileSync(join(import.meta.dirname, "tokens.css"), "utf8");

/**
 * What an animation may change. The first group is composited (no layout, no paint); colour and the
 * SVG stroke are paint-only. `grid-template-rows` is the one layout property allowed, for collapse.
 * Anything else (width, height, top, margin...) triggers layout every frame.
 */
const ALLOWED = new Set([
  "transform",
  "translate",
  "scale",
  "rotate",
  "opacity",
  "clip-path",
  "grid-template-rows",
  "stroke-dashoffset",
]);

const keyframes = () =>
  root.nodes.filter((n): n is AtRule => n.type === "atrule" && n.name === "keyframes");
const reduced = () =>
  root.nodes.find(
    (n): n is AtRule =>
      n.type === "atrule" && n.name === "media" && n.params.includes("prefers-reduced-motion"),
  );
const rulesIn = (container: { nodes?: postcss.ChildNode[] }) =>
  (container.nodes ?? []).filter((n): n is Rule => n.type === "rule");
const decls = (rule: Rule) => rule.nodes.filter((n): n is Declaration => n.type === "decl");

describe("motion.css: keyframes only animate cheap properties", () => {
  it("defines the presets' keyframes", () => {
    const names = keyframes().map((k) => k.params);
    expect(names).toEqual(
      expect.arrayContaining([
        "azmr-fade-in",
        "azmr-fade-out",
        "azmr-scale-in",
        "azmr-scale-out",
        "azmr-slide-up-in",
        "azmr-slide-up-out",
        "azmr-slide-down-in",
        "azmr-slide-down-out",
        "azmr-slide-left-in",
        "azmr-slide-left-out",
        "azmr-slide-right-in",
        "azmr-slide-right-out",
        "azmr-shimmer",
        "azmr-check-draw",
      ]),
    );
  });

  it.each(keyframes().map((k) => [k.params, k] as const))(
    "%s animates only allowed properties",
    (_name, frames) => {
      const props = new Set<string>();
      frames.walkDecls((d) => {
        props.add(d.prop);
      });
      for (const prop of props) expect(ALLOWED.has(prop), `${_name}: ${prop}`).toBe(true);
    },
  );

  it("every preset (except the pure fades) moves with transform, translate or scale, never with layout", () => {
    const forbidden =
      /^(width|height|top|left|right|bottom|margin|padding|inset|font-size|line-height)/;
    root.walkDecls((d) => {
      if (
        d.parent?.type === "rule" &&
        d.parent.parent?.type === "atrule" &&
        (d.parent.parent as AtRule).name === "keyframes"
      ) {
        expect(forbidden.test(d.prop), d.prop).toBe(false);
      }
    });
  });
});

describe("motion.css: timing comes from tokens", () => {
  it("uses no literal durations, delays or easings in a preset", () => {
    root.walkDecls(/^(animation|transition)/, (d) => {
      // A literal time is a bug (use a token); a literal zero is not.
      expect(d.value, `${d.prop}: ${d.value}`).not.toMatch(/(?<![\d.])(?!0m?s\b)\d+(\.\d+)?m?s\b/);
      // Check the value with the tokens taken out: their names contain the word `ease`.
      const bare = d.value.replace(/var\([^)]*\)/g, "");
      expect(bare, `${d.prop}: ${d.value}`).not.toMatch(
        /cubic-bezier|ease-in|ease-out|\bease\b|linear\(/,
      );
    });
  });

  it("uses the motion tokens for duration and easing", () => {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(text).toContain("var(--motion-duration-base)");
    expect(text).toContain("var(--motion-duration-fast)");
    expect(text).toContain("var(--motion-ease-decelerate)");
    expect(text).toContain("var(--motion-ease-accelerate)");
  });

  it("defines the two new motion tokens in tokens.css, and collapses them under reduced motion", () => {
    expect(tokensCss).toMatch(/--motion-stagger-step:\s*40ms/);
    expect(tokensCss).toMatch(/--motion-duration-ambient:\s*1500ms/);
    const reducedBlock =
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(tokensCss)?.[0] ?? "";
    expect(reducedBlock).toContain("--motion-stagger-step: 0ms");
    expect(reducedBlock).toContain("--motion-duration-ambient: 0.01ms");
  });

  it("reaches everyone: tokens.css imports it, and styles.css gets it through tokens.css", () => {
    // tokens.css is the one for apps with their own global styles (a docs site), and components such as
    // Skeleton shimmer and Collapse must work there too. The presets only define .motion-* classes.
    expect(tokensCss).toContain('@import "./motion.css"');
    expect(stylesCss).toContain('@import "./tokens.css"');
  });
});

describe("motion.css: classes match the presets map", () => {
  const classesInCss = () => {
    const found = new Set<string>();
    root.walkRules((rule) => {
      for (const m of rule.selector.matchAll(/\.(motion-[a-z0-9-]+)/g)) found.add(m[1] as string);
    });
    return found;
  };
  const classesInMap = () => {
    const found = new Set<string>();
    const walk = (v: unknown) => {
      if (typeof v === "string") for (const c of v.split(/\s+/)) c && found.add(c);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(motionPresets);
    return found;
  };

  it("every class in the map is defined, and every motion class defined is in the map", () => {
    expect([...classesInMap()].sort()).toEqual([...classesInCss()].sort());
  });

  it("names the presets the spec lists", () => {
    expect(Object.keys(motionPresets).sort()).toEqual(
      [
        "checkDraw",
        "collapse",
        "fade",
        "scale",
        "shimmer",
        "slideDown",
        "slideLeft",
        "slideRight",
        "slideUp",
        "stagger",
      ].sort(),
    );
  });
});

describe("motion.css: reduced motion", () => {
  const block = () => reduced() as AtRule;

  it("has a reduced-motion block", () => {
    expect(reduced()).toBeDefined();
  });

  it("every slide and scale preset falls back to a plain fade (opacity only, no movement)", () => {
    const byClass = new Map<string, string>();
    for (const rule of rulesIn(block())) {
      for (const sel of rule.selectors) {
        const name = decls(rule).find((d) => d.prop === "animation-name")?.value;
        if (name) byClass.set(sel.trim(), name);
      }
    }
    for (const cls of [
      ".motion-slide-up-in",
      ".motion-slide-down-in",
      ".motion-slide-left-in",
      ".motion-slide-right-in",
      ".motion-scale-in",
    ]) {
      expect(byClass.get(cls), cls).toBe("azmr-fade-in");
    }
    for (const cls of [
      ".motion-slide-up-out",
      ".motion-slide-down-out",
      ".motion-slide-left-out",
      ".motion-slide-right-out",
      ".motion-scale-out",
    ]) {
      expect(byClass.get(cls), cls).toBe("azmr-fade-out");
    }
  });

  it("stagger loses its delays, shimmer stops, the check is drawn at once, collapse does not animate", () => {
    const text = (block() as AtRule).toString();
    expect(text).toMatch(/\.motion-stagger-item[^{]*\{[^}]*animation-delay:\s*0s/);
    expect(text).toMatch(/\.motion-shimmer::after[^{]*\{[^}]*animation:\s*none/);
    expect(text).toMatch(/\.motion-check[^{]*\{[^}]*animation:\s*none/);
    expect(text).toMatch(/\.motion-check[^{]*\{[^}]*stroke-dashoffset:\s*0/);
    expect(text).toMatch(/\.motion-collapse[^{]*\{[^}]*transition:\s*none/);
  });

  it("view transitions are collapsed too", () => {
    expect((block() as AtRule).toString()).toContain("::view-transition-group(*)");
  });
});

describe("motion.css: collapse uses grid-template-rows, not a measured height", () => {
  it("animates grid-template-rows from 0fr to 1fr", () => {
    expect(css).toMatch(/\.motion-collapse\s*\{[^}]*grid-template-rows:\s*0fr/);
    expect(css).toMatch(
      /\.motion-collapse\[data-state="open"\][^{]*\{[^}]*grid-template-rows:\s*1fr/,
    );
    expect(css).toMatch(/transition:\s*grid-template-rows/);
  });

  it("its inner element can shrink to nothing", () => {
    expect(css).toMatch(/\.motion-collapse-inner\s*\{[^}]*min-height:\s*0/);
    expect(css).toMatch(/\.motion-collapse-inner\s*\{[^}]*overflow:\s*hidden/);
  });
});

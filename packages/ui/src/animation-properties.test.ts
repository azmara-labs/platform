import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Spec section 6: "animate only transform, opacity, clip-path and grid-template-rows". Anything that
 * animates layout (width, height, margin...) forces the browser to re-layout every frame.
 *
 * Colour and shadow transitions are allowed: they repaint but never re-layout. Where a component
 * genuinely animates a layout property it is listed in EXCEPTIONS with the reason, so a new one
 * cannot slip in unnoticed.
 */
const ALLOWED = new Set([
  "transform",
  "translate",
  "scale",
  "rotate",
  "opacity",
  "clip-path",
  "grid-template-rows",
  "colors",
  "color",
  "background-color",
  "border-color",
  "box-shadow",
  "shadow",
  "none",
  "all", // flagged separately below
]);

const EXCEPTIONS: Record<string, { property: string; reason: string }[]> = {
  "components/disclosure/accordion.tsx": [
    {
      property: "height",
      reason:
        "Base UI measures the panel and exposes --accordion-panel-height; the grid-template-rows collapse (Collapse) is the alternative when you control the markup.",
    },
  ],
  "components/disclosure/collapsible.tsx": [
    {
      property: "height",
      reason: "Base UI measures the panel and exposes --collapsible-panel-height.",
    },
  ],
  "components/toast/toaster.tsx": [
    {
      property: "height",
      reason:
        "Toasts of different heights stack; the frontmost height is Base UI's --toast-height.",
    },
  ],
  "components/progress/progress.tsx": [
    {
      property: "width",
      reason:
        "The determinate fill is a width set by Base UI. Tracked: animate it with transform: scaleX instead.",
    },
  ],
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

const srcDir = import.meta.dirname;
const files = walk(srcDir).map((f) => ({
  file: f,
  rel: relative(srcDir, f).replaceAll("\\", "/"),
  text: readFileSync(f, "utf8"),
}));

/** Properties named by Tailwind `transition-*` utilities in a file. */
function transitionProps(text: string): string[] {
  const props: string[] = [];
  for (const m of text.matchAll(/(?<![\w-])transition-\[([^\]]+)\]/g))
    props.push(...(m[1] as string).split(","));
  for (const m of text.matchAll(
    /(?<![\w-])transition-(colors|opacity|transform|shadow|none|all)\b/g,
  ))
    props.push(m[1] as string);
  return props.map((p) => p.trim());
}

describe("animation properties", () => {
  it("finds the files to check", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.rel === "components/toast/toaster.tsx")).toBe(true);
  });

  it("no component animates a layout property except the listed exceptions", () => {
    const offences: string[] = [];
    for (const { rel, text } of files) {
      const allowedHere = new Set((EXCEPTIONS[rel] ?? []).map((e) => e.property));
      for (const prop of transitionProps(text)) {
        if (!ALLOWED.has(prop) && !allowedHere.has(prop))
          offences.push(`${rel}: transition on "${prop}"`);
      }
    }
    expect(offences).toEqual([]);
  });

  it("nothing uses transition-all (it animates whatever changes, layout included)", () => {
    const offences = files
      .filter((f) => /(?<![\w-])transition-all\b/.test(f.text))
      .map((f) => f.rel);
    expect(offences).toEqual([]);
  });

  it("every exception is still real, so a fixed one is removed from the list", () => {
    for (const [rel, list] of Object.entries(EXCEPTIONS)) {
      const file = files.find((f) => f.rel === rel);
      expect(file, rel).toBeDefined();
      const used = new Set(transitionProps(file?.text ?? ""));
      for (const { property } of list)
        expect(used.has(property), `${rel} no longer animates ${property}`).toBe(true);
    }
  });

  it("every exception says why", () => {
    for (const list of Object.values(EXCEPTIONS))
      for (const e of list) expect(e.reason.length).toBeGreaterThan(20);
  });

  it("authored keyframes animate only allowed properties", () => {
    const offences: string[] = [];
    for (const { rel, text } of files) {
      for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\n\})/g)) {
        for (const d of (m[2] as string).matchAll(/([a-z-]+)\s*:/g)) {
          const prop = d[1] as string;
          if (
            ![
              "from",
              "to",
              "transform",
              "translate",
              "scale",
              "rotate",
              "opacity",
              "clip-path",
              "grid-template-rows",
              "stroke-dashoffset",
            ].includes(prop)
          ) {
            offences.push(`${rel}: @keyframes ${m[1]} sets ${prop}`);
          }
        }
      }
    }
    expect(offences).toEqual([]);
  });
});

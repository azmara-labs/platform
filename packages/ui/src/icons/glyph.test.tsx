// @vitest-environment node
import * as lucideReact from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as glyphs from "./glyphs.js";

// A glyph must be a drop-in for the lucide-react icon of the same name: identical markup for the
// props components and apps use, so swapping one for the other changes nothing on the page.
const propSets: Record<string, Record<string, unknown>> = {
  default: {},
  "size and class": { size: 16, className: "size-4 shrink-0" },
  "labelled image": { role: "img", "aria-label": "Done" },
  "explicit aria-hidden": { "aria-hidden": true, className: "a a b" },
  "colour and stroke": { color: "red", strokeWidth: 1.5 },
  "absolute stroke": { size: 48, absoluteStrokeWidth: true },
  "width and height": { width: 20, height: 18 },
};

const names = Object.keys(glyphs).sort();

describe("glyphs", () => {
  it("cover every icon the curated set and the components use", () => {
    expect(names.length).toBeGreaterThanOrEqual(59);
  });

  for (const [label, props] of Object.entries(propSets)) {
    it(`render exactly what lucide-react renders (${label})`, () => {
      const mismatches: string[] = [];
      for (const name of names) {
        const glyph = (glyphs as Record<string, Parameters<typeof createElement>[0]>)[name];
        const original = (
          lucideReact as unknown as Record<string, Parameters<typeof createElement>[0]>
        )[name];
        expect(original, `lucide-react has no ${name}`).toBeDefined();
        const ours = renderToStaticMarkup(createElement(glyph as never, props));
        const theirs = renderToStaticMarkup(createElement(original as never, props));
        if (ours !== theirs) mismatches.push(`${name}\n  ours:   ${ours}\n  theirs: ${theirs}`);
      }
      expect(mismatches).toEqual([]);
    });
  }

  it("have the same display names as lucide-react's icons", () => {
    for (const name of names) {
      const ours = (glyphs as Record<string, { displayName?: string }>)[name]?.displayName;
      const theirs = (lucideReact as unknown as Record<string, { displayName?: string }>)[name]
        ?.displayName;
      expect(ours, name).toBe(theirs);
    }
  });
});

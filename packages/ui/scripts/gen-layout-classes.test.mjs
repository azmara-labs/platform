import { describe, expect, it } from "vitest";
import { BREAKPOINTS, expectedTables } from "./gen-layout-classes.mjs";

// The committed table must equal what the generator computes: Tailwind needs these class names
// spelled out in full, so a hand edit or a stale file would silently drop CSS.
// To regenerate: node scripts/gen-layout-classes.mjs && pnpm biome check --write src/components/layout
const generated = await import("../src/components/layout/responsive.ts");
const expected = expectedTables();

describe("responsive class tables", () => {
  it("lists the breakpoints in order", () => {
    expect(generated.BREAKPOINTS).toEqual(BREAKPOINTS);
    expect(BREAKPOINTS).toEqual(["base", "sm", "md", "lg", "xl", "2xl"]);
  });

  it("matches the generator exactly (no drift, no hand edits)", () => {
    expect(generated.DIRECTION_CLASSES).toEqual(expected.direction);
    expect(generated.COLS_CLASSES).toEqual(expected.cols);
    expect(generated.SPAN_CLASSES).toEqual(expected.span);
  });

  it("uses the Tailwind prefix for every breakpoint except base", () => {
    expect(generated.COLS_CLASSES.base[3]).toBe("grid-cols-3");
    expect(generated.COLS_CLASSES.md[3]).toBe("md:grid-cols-3");
    expect(generated.COLS_CLASSES["2xl"][12]).toBe("2xl:grid-cols-12");
    expect(generated.SPAN_CLASSES.lg.full).toBe("lg:col-span-full");
    expect(generated.DIRECTION_CLASSES.sm.row).toBe("sm:flex-row");
  });

  it("has no duplicate class names", () => {
    const all = [
      ...Object.values(generated.DIRECTION_CLASSES).flatMap((t) => Object.values(t)),
      ...Object.values(generated.COLS_CLASSES).flatMap((t) => Object.values(t)),
      ...Object.values(generated.SPAN_CLASSES).flatMap((t) => Object.values(t)),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("covers 1 to 12 columns and spans, plus full", () => {
    expect(Object.keys(generated.COLS_CLASSES.base)).toHaveLength(12);
    expect(Object.keys(generated.SPAN_CLASSES.base)).toHaveLength(13);
  });
});

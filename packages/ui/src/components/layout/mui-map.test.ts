import { describe, expect, it } from "vitest";
import {
  muiBreakpoint,
  muiContainerSize,
  muiGridItemSpan,
  muiLayoutMap,
  muiSpacingToGap,
} from "./mui-map.js";

describe("MUI spacing to gap (MUI unit is 8px, ours is 4px)", () => {
  it.each([
    [0, 0],
    [0.5, 1],
    [1, 2],
    [1.5, 3],
    [2, 4],
    [2.5, 5],
    [3, 6],
    [4, 8],
    [5, 10],
    [6, 12],
  ])("spacing %s becomes gap %s", (spacing, gap) => {
    expect(muiSpacingToGap(spacing)).toBe(gap);
  });

  it("returns undefined for a spacing with no equivalent step, so the codemod flags it", () => {
    for (const spacing of [7, 0.25, -1, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(muiSpacingToGap(spacing), String(spacing)).toBeUndefined();
    }
  });
});

describe("MUI breakpoints", () => {
  it("maps xs to base and keeps the rest", () => {
    expect(muiBreakpoint("xs")).toBe("base");
    for (const key of ["sm", "md", "lg", "xl"] as const) expect(muiBreakpoint(key)).toBe(key);
  });

  it("returns undefined for unknown keys and prototype names", () => {
    for (const key of ["xxl", "", "constructor", "__proto__", "toString"]) {
      expect(muiBreakpoint(key), key).toBeUndefined();
    }
  });

  it("documents that the pixel widths differ (so layouts shift a little)", () => {
    expect(muiLayoutMap.breakpoints.note).toMatch(/600|640/);
  });
});

describe("MUI Container maxWidth", () => {
  it.each([
    ["xs", "sm"],
    ["sm", "sm"],
    ["md", "md"],
    ["lg", "lg"],
    ["xl", "2xl"],
  ] as const)("%s maps to %s", (maxWidth, size) => {
    expect(muiContainerSize(maxWidth)?.size).toBe(size);
  });

  it("maps false (no limit) to full", () => {
    expect(muiContainerSize(false)?.size).toBe("full");
  });

  it("flags xs as approximate (444px has no equivalent)", () => {
    expect(muiContainerSize("xs")?.approximate).toBe(true);
    expect(muiContainerSize("md")?.approximate).toBeUndefined();
  });

  it("defaults to MUI's own default, lg", () => {
    expect(muiContainerSize(undefined)?.size).toBe("lg");
  });

  it("returns undefined for unknown values", () => {
    expect(muiContainerSize("huge" as never)).toBeUndefined();
    expect(muiContainerSize("constructor" as never)).toBeUndefined();
  });
});

describe("MUI Grid item props to GridItem span", () => {
  it("converts breakpoint props to a responsive span", () => {
    expect(muiGridItemSpan({ xs: 12, md: 6 })).toEqual({
      span: { base: 12, md: 6 },
      unsupported: [],
    });
    expect(muiGridItemSpan({ xs: 6 })).toEqual({ span: { base: 6 }, unsupported: [] });
  });

  it("returns an empty span when none is given", () => {
    expect(muiGridItemSpan({})).toEqual({ span: undefined, unsupported: [] });
  });

  it("reports values it cannot express (auto, true, out of range) instead of guessing", () => {
    expect(muiGridItemSpan({ xs: "auto", md: 6 })).toEqual({
      span: { md: 6 },
      unsupported: ["xs=auto"],
    });
    expect(muiGridItemSpan({ sm: true })).toEqual({ span: undefined, unsupported: ["sm=true"] });
    expect(muiGridItemSpan({ lg: 13 })).toEqual({ span: undefined, unsupported: ["lg=13"] });
  });
});

describe("MUI layout prop mapping data", () => {
  it("describes the Grid, Stack and Container props", () => {
    expect(muiLayoutMap.grid.container).toMatch(/Grid/);
    expect(muiLayoutMap.grid.item).toMatch(/GridItem/);
    expect(muiLayoutMap.grid.props.spacing).toMatch(/gap/);
    expect(muiLayoutMap.stack.props.spacing).toMatch(/gap/);
    expect(muiLayoutMap.container.props.disableGutters).toMatch(/gutters/);
    expect(muiLayoutMap.container.props.maxWidth).toMatch(/size/);
  });
});

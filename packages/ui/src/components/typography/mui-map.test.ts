import { describe, expect, it } from "vitest";
import { type MuiVariantTarget, muiTypographyMap, resolveMuiTypography } from "./mui-map.js";
import { typographyVariants } from "./variants.js";

// The map is `as const` for the codemod; widen it to read optional fields in tests.
const variants: Record<string, MuiVariantTarget> = muiTypographyMap.variants;

describe("MUI Typography variant mapping (data for the migration codemod)", () => {
  const muiVariants = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "subtitle1",
    "subtitle2",
    "body1",
    "body2",
    "caption",
    "overline",
    "button",
    "inherit",
  ];

  it("covers every MUI Typography variant", () => {
    expect(Object.keys(variants).sort()).toEqual([...muiVariants].sort());
  });

  it("maps only to variants that exist", () => {
    for (const [mui, target] of Object.entries(variants)) {
      expect(Object.keys(typographyVariants), mui).toContain(target.variant);
    }
  });

  it("maps the common ones as the migration guide says", () => {
    expect(variants.h1?.variant).toBe("h1");
    expect(variants.body1?.variant).toBe("body");
    expect(variants.body2?.variant).toBe("small");
    expect(variants.subtitle1?.variant).toBe("lead");
    expect(variants.caption?.variant).toBe("caption");
    expect(variants.overline?.variant).toBe("overline");
  });

  it("records where the mapping is approximate, so the codemod can flag it", () => {
    expect(variants.subtitle2?.approximate).toBe(true);
    expect(variants.button?.approximate).toBe(true);
    expect(variants.h1?.approximate).toBeUndefined();
  });

  it("maps the Typography props the codemod rewrites", () => {
    expect(muiTypographyMap.props.gutterBottom).toBe("gutterBottom");
    expect(muiTypographyMap.props.noWrap).toBe("noWrap");
    expect(muiTypographyMap.props.align).toBe("align");
    expect(muiTypographyMap.props.component).toBe("as");
    expect(muiTypographyMap.props.paragraph).toMatch(/Text|p/);
  });

  it("resolves a variant, defaulting MUI's own default (body1) when none is given", () => {
    expect(resolveMuiTypography("h3")).toMatchObject({ variant: "h3" });
    expect(resolveMuiTypography(undefined)).toMatchObject({ variant: "body" });
    expect(resolveMuiTypography("nope")).toBeUndefined();
    expect(resolveMuiTypography("constructor")).toBeUndefined();
    expect(resolveMuiTypography("__proto__")).toBeUndefined();
  });
});

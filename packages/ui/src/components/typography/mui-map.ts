import type { TypographyVariant } from "./variants.js";

/**
 * How MUI `Typography` maps to `@azmr/ui` `Typography`. Pure data for the migration codemod, which
 * rewrites what is exact and flags what is `approximate` for a human to look at. Imports nothing
 * but a type.
 */
export interface MuiVariantTarget {
  /** The `@azmr/ui` variant to use. */
  variant: TypographyVariant;
  /** True when the look differs a little (weight, case), so the codemod should flag it. */
  approximate?: true;
  note?: string;
}

export const muiTypographyMap = {
  variants: {
    h1: { variant: "h1" },
    h2: { variant: "h2" },
    h3: { variant: "h3" },
    h4: { variant: "h4" },
    h5: { variant: "h5" },
    h6: { variant: "h6" },
    subtitle1: { variant: "lead" },
    subtitle2: {
      variant: "small",
      approximate: true,
      note: 'MUI subtitle2 is medium weight; use <Text size="sm" weight="medium"> to match exactly.',
    },
    body1: { variant: "body" },
    body2: { variant: "small" },
    caption: { variant: "caption" },
    overline: { variant: "overline" },
    button: {
      variant: "small",
      approximate: true,
      note: 'MUI `button` is uppercase medium text; use <Text size="sm" weight="medium" className="uppercase">.',
    },
    inherit: {
      variant: "body",
      approximate: true,
      note: 'MUI `inherit` takes the parent\'s font; use <Text as="span" size="base" className="text-inherit"> if that is the intent.',
    },
  },
  /** MUI prop name -> what to do. A prop name means "same prop"; other strings are instructions. */
  props: {
    variant: "variant",
    component: "as",
    gutterBottom: "gutterBottom",
    noWrap: "noWrap",
    align: "align",
    paragraph: "Use <Text> (a paragraph) instead of paragraph.",
    color: "Use tone (muted, destructive, success, warning, info) or a text-* class.",
    sx: "Use className with Tailwind utilities.",
  },
} as const satisfies {
  variants: Record<string, MuiVariantTarget>;
  props: Record<string, string>;
};

export type MuiTypographyVariant = keyof typeof muiTypographyMap.variants;

/**
 * Resolves a MUI Typography `variant` prop. `undefined` is MUI's own default, `body1`. Returns
 * `undefined` for a name MUI does not have.
 */
export function resolveMuiTypography(variant: string | undefined): MuiVariantTarget | undefined {
  const name = variant ?? "body1";
  return Object.hasOwn(muiTypographyMap.variants, name)
    ? muiTypographyMap.variants[name as MuiTypographyVariant]
    : undefined;
}

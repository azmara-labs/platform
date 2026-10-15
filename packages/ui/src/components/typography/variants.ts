/**
 * The type scale: every variant's semantic element and its classes, in one place. Colours are
 * tokens only. Classes are spelled out in full so the Tailwind scanner finds them in `dist`.
 */
export const typographyVariants = {
  h1: { element: "h1", classes: "scroll-m-20 text-4xl font-bold tracking-tight text-foreground" },
  h2: {
    element: "h2",
    classes: "scroll-m-20 text-3xl font-semibold tracking-tight text-foreground",
  },
  h3: {
    element: "h3",
    classes: "scroll-m-20 text-2xl font-semibold tracking-tight text-foreground",
  },
  h4: {
    element: "h4",
    classes: "scroll-m-20 text-xl font-semibold tracking-tight text-foreground",
  },
  h5: { element: "h5", classes: "scroll-m-20 text-lg font-semibold text-foreground" },
  h6: { element: "h6", classes: "scroll-m-20 text-base font-semibold text-foreground" },
  lead: { element: "p", classes: "text-lg text-muted-foreground" },
  body: { element: "p", classes: "text-base" },
  small: { element: "p", classes: "text-sm" },
  caption: { element: "span", classes: "text-xs text-muted-foreground" },
  overline: {
    element: "span",
    classes: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
  },
} as const;

export type TypographyVariant = keyof typeof typographyVariants;

export const ALIGN_CLASSES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
} as const;

export type TypographyAlign = keyof typeof ALIGN_CLASSES;

// Shared spacing and alignment vocabulary for the layout components. Class names are spelled out
// in full so the Tailwind scanner finds them in `dist`.

/** A gap step (Tailwind's 4px scale), or `density` to follow the `data-density` token. */
export const GAP_CLASSES = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  density: "gap-(--density-gap)",
} as const;

export type Gap = keyof typeof GAP_CLASSES;

export const ALIGN_ITEMS_CLASSES = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

export type AlignItems = keyof typeof ALIGN_ITEMS_CLASSES;

export const JUSTIFY_CONTENT_CLASSES = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const;

export type JustifyContent = keyof typeof JUSTIFY_CONTENT_CLASSES;

export const JUSTIFY_ITEMS_CLASSES = {
  start: "justify-items-start",
  center: "justify-items-center",
  end: "justify-items-end",
  stretch: "justify-items-stretch",
} as const;

export type JustifyItems = keyof typeof JUSTIFY_ITEMS_CLASSES;

/** Elements a layout box may render as. */
export type LayoutElement =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "nav"
  | "header"
  | "footer"
  | "main"
  | "ul"
  | "ol"
  | "form"
  | "fieldset";

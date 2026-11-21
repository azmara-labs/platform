import { cva } from "class-variance-authority";

/** The clickable row: box and label side by side. `lg` is at least 44px tall, for touch. */
export const choiceVariants = cva(
  "flex w-fit max-w-full cursor-pointer items-center select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  {
    variants: {
      size: {
        sm: "min-h-8 gap-2 text-xs",
        md: "min-h-(--density-control-height) gap-2.5 text-sm",
        lg: "min-h-11 gap-3 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** Where the description starts: under the label text, past the box and the gap. */
export const descriptionVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "ms-[1.375rem] text-xs",
      md: "ms-[1.625rem] text-sm",
      lg: "ms-8 text-sm",
    },
  },
  defaultVariants: { size: "md" },
});

/** The visible box (checkbox, radio) or track (switch). */
export const boxVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "size-3.5",
      md: "size-4",
      lg: "size-5",
    },
  },
  defaultVariants: { size: "md" },
});

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

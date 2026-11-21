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

/** Where the description starts under a switch: past the (wider) track and the gap. */
export const switchDescriptionVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "ms-9 text-xs",
      md: "ms-[2.875rem] text-sm",
      lg: "ms-14 text-sm",
    },
  },
  defaultVariants: { size: "md" },
});

/** The switch track. A 2px transparent border keeps the thumb inset, so the sums below hold. */
export const trackVariants = cva(
  "relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent bg-input transition-colors duration-(--motion-duration-fast) ease-standard data-[checked]:bg-primary data-[invalid]:ring-1 data-[invalid]:ring-destructive data-[disabled]:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "h-4 w-7",
        md: "h-5 w-9",
        lg: "h-6 w-11",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** The thumb slides by the track's inner width minus its own: 12px, 16px, 20px. */
export const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-sm transition-transform duration-(--motion-duration-fast) ease-standard",
  {
    variants: {
      size: {
        sm: "size-3 data-[checked]:translate-x-3 rtl:data-[checked]:-translate-x-3",
        md: "size-4 data-[checked]:translate-x-4 rtl:data-[checked]:-translate-x-4",
        lg: "size-5 data-[checked]:translate-x-5 rtl:data-[checked]:-translate-x-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

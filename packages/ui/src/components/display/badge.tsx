import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/cn.js";
import { STATUS } from "./status.js";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: STATUS.destructive.badge,
        success: STATUS.success.badge,
        warning: STATUS.warning.badge,
        info: STATUS.info.badge,
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** A small label for status or a count. Server-safe. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant, className, ...props },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

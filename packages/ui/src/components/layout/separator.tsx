import { forwardRef, type HTMLAttributes, type Ref } from "react";
import { cn } from "../../lib/cn.js";

export interface SeparatorProps extends HTMLAttributes<HTMLElement> {
  orientation?: "horizontal" | "vertical";
  /**
   * Purely visual: hidden from assistive technology (`role="none"`). Use it when the content
   * either side of the line already reads as separate. Otherwise it is announced as a separator.
   */
  decorative?: boolean;
}

/**
 * A line between content. A horizontal one is a real `<hr>`; a vertical one is a `role="separator"`
 * with `aria-orientation`. Server-safe.
 */
export const Separator = forwardRef<HTMLElement, SeparatorProps>(function Separator(
  { orientation = "horizontal", decorative = false, className, ...props },
  ref,
) {
  const vertical = orientation === "vertical";
  const classes = cn(
    "shrink-0 border-0 bg-border",
    vertical ? "w-px self-stretch" : "h-px w-full",
    className,
  );
  const semantics = decorative
    ? { role: "none" }
    : vertical
      ? { role: "separator", "aria-orientation": "vertical" as const }
      : {};

  return vertical ? (
    <div ref={ref as Ref<HTMLDivElement>} className={classes} {...semantics} {...props} />
  ) : (
    <hr ref={ref as Ref<HTMLHRElement>} className={classes} {...semantics} {...props} />
  );
});

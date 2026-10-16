import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { motionPresets } from "./presets.js";

export interface CollapseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Whether the content is showing. */
  open: boolean;
  children: ReactNode;
}

/**
 * Shows and hides content with a height animation that is **not measured in JavaScript**: it
 * animates `grid-template-rows` between `0fr` and `1fr`. Server-safe, and instant under reduced
 * motion.
 *
 * The content stays mounted while closed, so it keeps its state and can animate; while closed it is
 * `inert` and `aria-hidden`, so it cannot be focused or read. You own the trigger: give it
 * `aria-expanded` and `aria-controls` pointing at this element's `id`. For a ready-made disclosure
 * with all of that wired, use `Collapsible` or `Accordion`.
 */
export const Collapse = forwardRef<HTMLDivElement, CollapseProps>(function Collapse(
  { open, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      {...(open ? {} : { inert: true, "aria-hidden": true })}
      className={cn(motionPresets.collapse.root, className)}
      {...props}
    >
      <div className={motionPresets.collapse.inner}>{children}</div>
    </div>
  );
});

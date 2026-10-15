import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Collapsible as CollapsiblePrimitive } from "../../primitives/collapsible.js";

/** One show/hide region. The trigger is a real button with `aria-expanded` and `aria-controls`. */
export const Collapsible = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>, "className"> & {
    className?: string;
  }
>(function Collapsible({ className, ...props }, ref) {
  return <CollapsiblePrimitive.Root ref={ref} className={cn("w-full", className)} {...props} />;
});

/** The control that toggles the content. Style it, or render your own element with `render`. */
export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>, "className"> & {
    className?: string;
  }
>(function CollapsibleTrigger({ className, ...props }, ref) {
  return (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      className={cn(
        "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    />
  );
});

/**
 * The content. Its height animates from the panel's measured height (Base UI measures it and
 * exposes `--collapsible-panel-height`) using the motion tokens, so it is instant under
 * `prefers-reduced-motion`. `className` styles an inner wrapper, so padding never fights the
 * height animation.
 */
export const CollapsibleContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Panel>, "className"> & {
    className?: string;
  }
>(function CollapsibleContent({ className, children, ...props }, ref) {
  return (
    <CollapsiblePrimitive.Panel
      ref={ref}
      className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-(--motion-duration-base) ease-standard data-[ending-style]:h-0 data-[starting-style]:h-0"
      {...props}
    >
      <div className={className}>{children}</div>
    </CollapsiblePrimitive.Panel>
  );
});

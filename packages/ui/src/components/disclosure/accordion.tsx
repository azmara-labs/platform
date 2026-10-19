import { type ComponentPropsWithoutRef, createElement, forwardRef } from "react";
import { ChevronDown } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Accordion as AccordionPrimitive } from "../../primitives/accordion.js";

type WithClassName<T> = Omit<T, "className"> & { className?: string };

/**
 * A set of collapsible sections. One open at a time by default; `multiple` allows several. The
 * keyboard map follows the WAI-ARIA accordion pattern: Tab to a trigger, Enter or Space to
 * toggle, Up and Down to move between triggers, Home and End to jump.
 */
export const Accordion = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>>
>(function Accordion({ className, onKeyDown, loopFocus = true, orientation, ...props }, ref) {
  return (
    <AccordionPrimitive.Root
      ref={ref}
      orientation={orientation}
      loopFocus={loopFocus}
      className={cn("w-full", className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) moveFocus(event, orientation ?? "vertical", loopFocus);
      }}
      {...props}
    />
  );
});

const PREVIOUS = { vertical: "ArrowUp", horizontal: "ArrowLeft" } as const;
const NEXT = { vertical: "ArrowDown", horizontal: "ArrowRight" } as const;

/**
 * The WAI-ARIA accordion arrow-key map. Base UI 1.9 declares `loopFocus` but does not implement
 * arrow navigation, so it lives here. Only keys pressed on one of this accordion's own triggers
 * count: keys typed inside a panel are left alone, and a nested accordion handles its own keys
 * first (it calls preventDefault), so the outer one skips them.
 */
function moveFocus(
  event: React.KeyboardEvent<HTMLElement>,
  orientation: "vertical" | "horizontal",
  loop: boolean,
) {
  const root = event.currentTarget;
  const target = event.target as HTMLElement;
  const ownTriggers = Array.from(
    root.querySelectorAll<HTMLElement>("button[aria-expanded][data-index]"),
  );
  const index = ownTriggers.indexOf(target);
  if (index === -1) return;

  const enabled = ownTriggers.filter(
    (el) => !(el as HTMLButtonElement).disabled && !el.hasAttribute("data-disabled"),
  );
  const position = enabled.indexOf(target);
  let next: HTMLElement | undefined;
  switch (event.key) {
    case NEXT[orientation]:
      next = enabled[position + 1] ?? (loop ? enabled[0] : undefined);
      break;
    case PREVIOUS[orientation]:
      next = enabled[position - 1] ?? (loop ? enabled[enabled.length - 1] : undefined);
      break;
    case "Home":
      next = enabled[0];
      break;
    case "End":
      next = enabled[enabled.length - 1];
      break;
    default:
      return;
  }
  event.preventDefault();
  next?.focus();
}

export const AccordionItem = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
});

export interface AccordionTriggerProps
  extends WithClassName<ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>> {
  /** The heading level wrapping the trigger, to fit the page outline. Default 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger({ headingLevel = 3, className, children, ...props }, ref) {
    return (
      <AccordionPrimitive.Header render={createElement(`h${headingLevel}`)} className="flex">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex flex-1 items-center justify-between gap-4 rounded-sm py-4 text-left text-sm font-medium outline-none transition-colors duration-(--motion-duration-fast) hover:underline focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[panel-open]:[&>svg]:rotate-180",
            className,
          )}
          {...props}
        >
          {children}
          <Icon
            icon={ChevronDown}
            className="transition-transform duration-(--motion-duration-fast) ease-standard"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );
  },
);

/** The panel. Its height animates from the measured height with the motion tokens. */
export const AccordionContent = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof AccordionPrimitive.Panel>>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Panel
      ref={ref}
      className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-(--motion-duration-base) ease-standard data-[ending-style]:h-0 data-[starting-style]:h-0"
      {...props}
    >
      <div className={cn("pb-4", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
});

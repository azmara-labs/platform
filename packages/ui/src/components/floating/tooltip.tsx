import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
} from "react";
import { cn } from "../../lib/cn.js";
import { Tooltip as TooltipPrimitive } from "../../primitives/tooltip.js";
import { TOOLTIP_CLOSE_DELAY_MS, TOOLTIP_DELAY_MS } from "./delays.js";
import { FLOATING_MOTION, POSITION_DEFAULTS, type PositionProps } from "./shared.js";

/**
 * Shares one delay across every tooltip inside it: the first waits `delay`, then its neighbours
 * open at once while one is showing. Wrap a toolbar, or the app.
 */
export function TooltipProvider({
  delay = TOOLTIP_DELAY_MS,
  closeDelay = TOOLTIP_CLOSE_DELAY_MS,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} {...props} />;
}

// Base UI 1.9 renders a tooltip with no `role` and does not link it to its trigger, so a screen
// reader never hears it. The WAI-ARIA tooltip pattern needs `role="tooltip"` on the popup and
// `aria-describedby` on the trigger while it is showing; this context carries the id between them.
const TooltipLink = createContext<{ id: string; open: boolean } | null>(null);

/**
 * A short label for a control, shown on hover and keyboard focus. It describes the trigger
 * (`aria-describedby` while open), is dismissed with Escape, and never takes the pointer.
 *
 * Touch: there is no hover, so it does not open on touch. Never put essential information in a
 * tooltip; use a `Popover` when people on touch devices need the content.
 */
export function Tooltip({
  open,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const id = useId();
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  return (
    <TooltipLink.Provider value={{ id, open: isOpen }}>
      <TooltipPrimitive.Root
        open={isOpen}
        onOpenChange={(next, details) => {
          setInternal(next);
          onOpenChange?.(next, details);
        }}
        {...props}
      />
    </TooltipLink.Provider>
  );
}

export const TooltipTrigger = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(function TooltipTrigger(props, ref) {
  const link = useContext(TooltipLink);
  return (
    <TooltipPrimitive.Trigger
      ref={ref as never}
      aria-describedby={link?.open ? link.id : undefined}
      {...props}
    />
  );
});

export type TooltipContentProps = Omit<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup>,
  "className"
> &
  PositionProps & { className?: string };

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    {
      side,
      align,
      sideOffset = POSITION_DEFAULTS.sideOffset,
      collisionPadding = POSITION_DEFAULTS.collisionPadding,
      className,
      ...props
    },
    ref,
  ) {
    const link = useContext(TooltipLink);
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className="z-(--z-tooltip)"
        >
          <TooltipPrimitive.Popup
            ref={ref}
            id={link?.id}
            role="tooltip"
            className={cn(
              "pointer-events-none max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-elevation-2",
              FLOATING_MOTION,
              // Moving from one tooltip to the next must not replay the animation.
              "data-[instant]:transition-none",
              className,
            )}
            {...props}
          />
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    );
  },
);

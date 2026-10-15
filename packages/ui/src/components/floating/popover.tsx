import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Popover as PopoverPrimitive } from "../../primitives/popover.js";
import { FLOATING_MOTION, POSITION_DEFAULTS, type PositionProps } from "./shared.js";

/**
 * A panel anchored to a button, opened by click or Enter and Space. Focus moves into it, Tab
 * moves through its content, and Escape or an outside click closes it and returns focus to the
 * trigger. Use it for anything interactive; for a short label use `Tooltip`.
 */
export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

/** Closes the popover. Put it inside `PopoverContent`. */
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = Omit<
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup>,
  "className"
> &
  PositionProps & { className?: string };

/**
 * The panel. It is named by `PopoverTitle` (or `aria-label`) and described by
 * `PopoverDescription`. Its size is capped to the space available, so it scrolls instead of
 * running off the viewport.
 */
export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
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
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className="z-(--z-popover)"
        >
          <PopoverPrimitive.Popup
            ref={ref}
            className={cn(
              "max-h-(--available-height) w-72 max-w-(--available-width) overflow-auto rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-elevation-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              FLOATING_MOTION,
              className,
            )}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  },
);

export const PopoverTitle = forwardRef<
  HTMLHeadingElement,
  Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Title>, "className"> & {
    className?: string;
  }
>(function PopoverTitle({ className, ...props }, ref) {
  return (
    <PopoverPrimitive.Title
      ref={ref}
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
});

export const PopoverDescription = forwardRef<
  HTMLParagraphElement,
  Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Description>, "className"> & {
    className?: string;
  }
>(function PopoverDescription({ className, ...props }, ref) {
  return (
    <PopoverPrimitive.Description
      ref={ref}
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

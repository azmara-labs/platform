import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { PreviewCard as PreviewCardPrimitive } from "../../primitives/preview-card.js";
import { FLOATING_MOTION, POSITION_DEFAULTS, type PositionProps } from "./shared.js";

/**
 * A preview of a link's target, shown on hover and keyboard focus of the link. The link works
 * without the card, so the card must only ever be a convenience: it is not announced as a
 * dialog, it does not open on touch, and nothing in it may be the only way to reach something.
 */
export const HoverCard = PreviewCardPrimitive.Root;

/** The link the card previews. Renders an `<a>`: give it an `href`. */
export const HoverCardTrigger = PreviewCardPrimitive.Trigger;

export type HoverCardContentProps = Omit<
  ComponentPropsWithoutRef<typeof PreviewCardPrimitive.Popup>,
  "className"
> &
  PositionProps & { className?: string };

export const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  function HoverCardContent(
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
      <PreviewCardPrimitive.Portal>
        <PreviewCardPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className="z-(--z-popover)"
        >
          <PreviewCardPrimitive.Popup
            ref={ref}
            className={cn(
              "max-h-(--available-height) w-64 max-w-(--available-width) overflow-auto rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-elevation-3 outline-none",
              FLOATING_MOTION,
              className,
            )}
            {...props}
          />
        </PreviewCardPrimitive.Positioner>
      </PreviewCardPrimitive.Portal>
    );
  },
);

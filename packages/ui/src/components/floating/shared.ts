export type Side = "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";
export type Align = "start" | "center" | "end";

/** Where a floating surface sits relative to its trigger. */
export interface PositionProps {
  /** The side of the trigger to open on. It flips to the opposite side when there is no room. */
  side?: Side;
  /** Alignment along that side. */
  align?: Align;
  /** Gap between the trigger and the surface, in px. Default 6. */
  sideOffset?: number;
  /** Minimum distance kept from the viewport edge, in px. Default 8. */
  collisionPadding?: number;
}

export const POSITION_DEFAULTS = { sideOffset: 6, collisionPadding: 8 } as const;

/** Enter and exit: a short fade and scale from the trigger, on the motion tokens. */
export const FLOATING_MOTION =
  "origin-(--transform-origin) transition-[opacity,scale] duration-(--motion-duration-fast) ease-standard data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0";

/** The positioner sits in a portal, so it needs its own stacking layer. */
export const POSITIONER_BASE = "outline-none";

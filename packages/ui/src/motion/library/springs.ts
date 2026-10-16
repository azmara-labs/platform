/**
 * Spring presets for the `transition` prop of an `m` element. Springs suit movement that follows a
 * gesture (a dropped item settling); for plain enters and exits prefer the CSS presets, which are
 * cheaper and follow the motion tokens.
 */
export const springs = {
  /** Soft and slow to settle: a panel gliding into place. */
  gentle: { type: "spring", stiffness: 120, damping: 20 },
  /** Quick with no wobble: a control responding. */
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  /** A visible overshoot: a playful confirmation. Use sparingly. */
  bouncy: { type: "spring", stiffness: 400, damping: 15 },
} as const;

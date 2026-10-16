/**
 * The preset classes from `@azmr/ui/styles.css`. Spelled out in full so the Tailwind scanner finds
 * them in `dist`, and so a typo is a type error. Every class is defined in `motion.css` and every
 * motion class there is listed here (a test keeps the two in step).
 *
 * `enter` eases out and runs on `--motion-duration-base`; `exit` is shorter and eases in. Under
 * `prefers-reduced-motion` the slides and scales become a plain fade.
 */
export const motionPresets = {
  fade: { enter: "motion-fade-in", exit: "motion-fade-out" },
  scale: { enter: "motion-scale-in", exit: "motion-scale-out" },
  slideUp: { enter: "motion-slide-up-in", exit: "motion-slide-up-out" },
  slideDown: { enter: "motion-slide-down-in", exit: "motion-slide-down-out" },
  slideLeft: { enter: "motion-slide-left-in", exit: "motion-slide-left-out" },
  slideRight: { enter: "motion-slide-right-in", exit: "motion-slide-right-out" },
  /** A grid-template-rows collapse. Use `Collapse`. */
  collapse: { root: "motion-collapse", inner: "motion-collapse-inner" },
  /** A staggered list. Use `Stagger`. */
  stagger: { container: "motion-stagger", item: "motion-stagger-item" },
  /** A sweeping highlight for loading placeholders. Put it on a rounded, overflow-clipped box. */
  shimmer: "motion-shimmer",
  /** An SVG tick that draws itself. Use `AnimatedCheck`. */
  checkDraw: "motion-check",
} as const;

export type MotionPresetName = keyof typeof motionPresets;

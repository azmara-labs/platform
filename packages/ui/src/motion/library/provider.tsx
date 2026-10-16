import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadDom = () => import("./features-dom.js").then((module) => module.default);
const loadMax = () => import("./features-max.js").then((module) => module.default);

export interface MotionProviderProps {
  children: ReactNode;
  /**
   * What the `m` components can do. `dom` (default): animation, variants, hover, tap and exit. `max`
   * adds layout animation, drag and reorder, at a larger download. Either loads on demand.
   */
  features?: "dom" | "max";
  /** Forbid the full `motion` component inside (use `m`), so the whole bundle is never pulled in by accident. Default true. */
  strict?: boolean;
}

/**
 * Sets up the `motion` library the cheap way: `LazyMotion` loads the animation features after first
 * render instead of in your main bundle, and `MotionConfig reducedMotion="user"` makes every
 * animation inside follow the system setting (movement is skipped, fades still play). Wrap the part
 * of the app that uses `m`.
 */
export function MotionProvider({ children, features = "dom", strict = true }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={features === "max" ? loadMax : loadDom} strict={strict}>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

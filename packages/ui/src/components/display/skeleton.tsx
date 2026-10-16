import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/cn.js";
import { motionPresets } from "../../motion/presets/presets.js";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Pulse while loading. Default true; the global reduced-motion rule stills it for users who ask. */
  animate?: boolean;
  /** Sweep a highlight across (needs `@azmr/ui/styles.css`) instead of pulsing. Stops with reduced motion. */
  shimmer?: boolean;
}

/**
 * A placeholder shaped like content that is loading. Decorative (`aria-hidden`): mark the loading
 * container `aria-busy` and announce the result instead. Server-safe.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { animate = true, shimmer = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted",
        animate && (shimmer ? motionPresets.shimmer : "animate-pulse"),
        className,
      )}
      {...props}
    />
  );
});

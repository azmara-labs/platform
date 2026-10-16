import { forwardRef, type SVGProps } from "react";
import { cn } from "../../lib/cn.js";
import { motionPresets } from "./presets.js";

export interface AnimatedCheckProps extends Omit<SVGProps<SVGSVGElement>, "ref" | "children"> {
  /** Pixel size (width and height). Default 24. */
  size?: number;
  /** Accessible name. When set the tick is an image ("Saved"); without it the tick is decorative. */
  label?: string;
}

/**
 * A tick that draws itself, for a success moment. It uses the current text colour, so
 * `className="text-success"` colours it. Under reduced motion it is drawn at once. Server-safe.
 */
export const AnimatedCheck = forwardRef<SVGSVGElement, AnimatedCheckProps>(function AnimatedCheck(
  { size = 24, label, className, ...props },
  ref,
) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) by default, or role="img" with an aria-label when `label` is set
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={cn(motionPresets.checkDraw, className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...props}
    >
      <path
        d="M5 13l4 4L19 7"
        pathLength={24}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

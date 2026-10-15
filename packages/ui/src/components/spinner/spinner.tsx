import { forwardRef, type SVGProps } from "react";
import { cn } from "../../lib/cn.js";

export interface SpinnerProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  /**
   * Accessible name. When set the spinner is announced as a status ("Loading customers");
   * when omitted it is decorative and hidden from assistive technology (use that when the
   * surrounding control already says it is busy, as `Button loading` does).
   */
  label?: string;
}

/**
 * An indeterminate progress indicator. It keeps spinning under `prefers-reduced-motion`
 * (`data-motion="essential"`) because a frozen spinner reads as a hung page.
 */
export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(function Spinner(
  { label, className, ...props },
  ref,
) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) by default, or role="status" with an aria-label when `label` is set; both paths are covered by axe tests
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      data-motion="essential"
      className={cn("size-4 animate-spin", className)}
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
});

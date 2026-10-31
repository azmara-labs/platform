import { type CSSProperties, forwardRef, type SVGProps } from "react";
import { cn } from "../../lib/cn.js";

/** `inherit` follows the font size (1em), for a spinner inside a button or a line of text. */
export const spinnerSizes = {
  xs: "size-3",
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
  inherit: "size-[1em]",
} as const;

/**
 * `current` follows the text colour. The others match Progress's tones (a test keeps the two in
 * step), so each has the same checked contrast against the page in light and dark.
 */
export const spinnerTones = {
  current: "",
  default: "text-primary",
  success: "text-success",
  warning: "text-warning-text",
  destructive: "text-destructive",
  info: "text-info",
} as const;

export type SpinnerSize = keyof typeof spinnerSizes;
export type SpinnerTone = keyof typeof spinnerTones;

/** Fades in after `animation-delay`, invisible until then (`both` holds the first keyframe). */
export const delayedFadeIn =
  "animate-[azmr-fade-in_var(--motion-duration-base)_var(--motion-ease-decelerate)_both]";

/** The inline style that holds a `delayedFadeIn` element back for `delay` ms. */
export function delayStyle(delay: number | undefined, style?: CSSProperties) {
  return delay ? { animationDelay: `${delay}ms`, ...style } : style;
}

export interface SpinnerProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  /**
   * Accessible name. When set the spinner is announced as a status ("Loading customers");
   * when omitted it is decorative and hidden from assistive technology (use that when the
   * surrounding control already says it is busy, as `Button loading` does). For visible text,
   * a logo in the middle or a whole loading region, use `Loading` from `@azmr/ui/loading`.
   */
  label?: string;
  /** Default `sm` (1rem). `inherit` is 1em. A `size-*` class still overrides it. */
  size?: SpinnerSize;
  /** Default `current`, the surrounding text colour. */
  tone?: SpinnerTone;
  /**
   * Milliseconds to stay invisible before fading in, so a fast load never flashes a spinner. Pure
   * CSS, so it works in Server Components and `loading.tsx`.
   */
  delay?: number;
}

/**
 * An indeterminate progress indicator. It keeps spinning under `prefers-reduced-motion`
 * (`data-motion="essential"`) because a frozen spinner reads as a hung page.
 */
export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(function Spinner(
  { label, size = "sm", tone = "current", delay, className, ...props },
  ref,
) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) by default, or role="status" with an aria-label when `label` is set; both paths are covered by axe tests
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      data-motion="essential"
      className={cn("animate-spin", spinnerSizes[size], spinnerTones[tone], className)}
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
      {...props}
    >
      {/* The fade sits on a group: the svg's own animation is the spin. */}
      <g className={delay ? delayedFadeIn : undefined} style={delayStyle(delay)}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
});

import { type HTMLAttributes, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { useReducedMotion } from "../../use-reduced-motion.js";

export interface CountUpProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number to show. When it changes, the display counts to the new value. */
  value: number;
  /** Where to start when `animateOnMount` is on. Default 0. */
  from?: number;
  /** Count up from `from` when first shown, not only when `value` changes. Default false. */
  animateOnMount?: boolean;
  /** Milliseconds to count over. Default 800. */
  duration?: number;
  /** `Intl.NumberFormat` options: currency, percent, decimals. */
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts to its new value. Screen readers are given the **final value at once** (the
 * counting is hidden from them, so nobody hears a stream of numbers), the digits are tabular so the
 * width does not jitter, and under reduced motion it jumps straight to the value.
 */
export function CountUp({
  value,
  from = 0,
  animateOnMount = false,
  duration = 800,
  format,
  locale,
  className,
  ...props
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(animateOnMount ? from : value);
  // Where the animation is now, so a new target mid-count continues from there instead of jumping.
  const current = useRef(display);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const start = current.current;
    if (start === value) return;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1);
      const next = progress >= 1 ? value : start + (value - start) * easeOutCubic(progress);
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, duration]);

  // Whole numbers count in whole numbers. A caller who asks for a minimum of N decimals means exactly
  // N (Intl would allow up to three while the number is between values, and would throw if our
  // maximum of 0 sat below their minimum). Anything else they set wins.
  const options: Intl.NumberFormatOptions = {
    ...(Number.isInteger(value) && { maximumFractionDigits: 0 }),
    ...(format?.minimumFractionDigits !== undefined && {
      maximumFractionDigits: format.minimumFractionDigits,
    }),
    ...format,
  };
  const text = (n: number) => new Intl.NumberFormat(locale, options).format(n);

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      <span aria-hidden="true">{text(display)}</span>
      <span className="sr-only">{text(value)}</span>
    </span>
  );
}

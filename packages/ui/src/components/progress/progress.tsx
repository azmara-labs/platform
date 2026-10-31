import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
} from "react";
import { cn } from "../../lib/cn.js";
import { Progress as ProgressPrimitive } from "../../primitives/progress.js";
import { type ProgressTone, progressTones } from "./tones.js";

export { type ProgressTone, progressTones };

const LINEAR_HEIGHT = { sm: "h-1.5", md: "h-2", lg: "h-3" } as const;
const CIRCULAR_SIZE = { sm: "size-6", md: "size-10", lg: "size-16" } as const;

// The ring is drawn in a 36-unit square with a 16-unit radius.
const RADIUS = 16;
const CIRCUMFERENCE = Number((2 * Math.PI * RADIUS).toFixed(2));

export interface ProgressOwnProps {
  /** The current value, or `null` when the amount is not known (indeterminate). Default range is 0 to 100. */
  value: number | null;
  min?: number;
  max?: number;
  /** `linear` (default) is a bar; `circular` is a ring. */
  variant?: "linear" | "circular";
  size?: keyof typeof LINEAR_HEIGHT;
  tone?: ProgressTone;
  /** Show the percentage as text next to (linear) or inside (circular) the indicator. */
  showValue?: boolean;
  /** The text a screen reader announces, instead of the default percentage. */
  valueText?: (value: number | null) => string;
  className?: string;
}

/** A progress bar needs a name: a label, or the id of the heading that describes it. */
type Named = { "aria-label": string } | { "aria-labelledby": string };

export type ProgressProps = ProgressOwnProps &
  Named &
  Omit<
    ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    keyof ProgressOwnProps | "aria-label" | "aria-labelledby" | "getAriaValueText" | "children"
  >;

const ProgressImpl = forwardRef<
  HTMLDivElement,
  ProgressOwnProps &
    Omit<
      ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
      keyof ProgressOwnProps | "getAriaValueText" | "children"
    >
>(function Progress(
  {
    value,
    min = 0,
    max = 100,
    variant = "linear",
    size = "md",
    tone = "default",
    showValue = false,
    valueText,
    className,
    ...props
  },
  ref,
) {
  // A value that is not a finite number is treated as unknown rather than rendered as NaN.
  const current =
    value === null || !Number.isFinite(value) ? null : Math.min(max, Math.max(min, value));
  const indeterminate = current === null;
  const percent = indeterminate ? 0 : ((current - min) / (max - min || 1)) * 100;
  const palette = progressTones[tone];
  const text = indeterminate ? "" : `${Math.round(percent)}%`;

  const root = {
    ref,
    value: current,
    min,
    max,
    getAriaValueText: valueText
      ? (_formatted: string, v: number | null) => valueText(v)
      : undefined,
    ...props,
  };

  if (variant === "circular") {
    const filled = Number(((CIRCUMFERENCE * (indeterminate ? 25 : percent)) / 100).toFixed(2));
    return (
      <ProgressPrimitive.Root
        {...root}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          CIRCULAR_SIZE[size],
          className,
        )}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          data-motion={indeterminate ? "essential" : undefined}
          className={cn("size-full -rotate-90", palette.ring, indeterminate && "animate-spin")}
        >
          <circle cx="18" cy="18" r={RADIUS} strokeWidth="4" className="stroke-muted" />
          <circle
            data-arc=""
            cx="18"
            cy="18"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
        </svg>
        {showValue && !indeterminate && (
          <span
            data-progress-value=""
            aria-hidden="true"
            className="absolute text-xs font-medium tabular-nums"
          >
            {text}
          </span>
        )}
      </ProgressPrimitive.Root>
    );
  }

  return (
    <ProgressPrimitive.Root {...root} className={cn("flex w-full items-center gap-3", className)}>
      <ProgressPrimitive.Track
        className={cn("relative w-full overflow-hidden rounded-full bg-muted", LINEAR_HEIGHT[size])}
      >
        <ProgressPrimitive.Indicator
          data-motion={indeterminate ? "essential" : undefined}
          className={cn(
            "h-full rounded-full transition-[width] duration-(--motion-duration-base) ease-standard",
            palette.indicator,
            // Unknown amount: a partial bar that pulses. Under reduced motion it keeps pulsing
            // (opacity, not movement) because a still full-width bar would read as complete.
            indeterminate && "w-2/5 animate-pulse",
          )}
        />
      </ProgressPrimitive.Track>
      {showValue && !indeterminate && (
        <span
          data-progress-value=""
          aria-hidden="true"
          className="min-w-10 text-right text-sm tabular-nums text-muted-foreground"
        >
          {text}
        </span>
      )}
    </ProgressPrimitive.Root>
  );
});

/**
 * A linear or circular progress indicator with a required accessible name. `value={null}` is
 * indeterminate. Built on Base UI, so the progressbar semantics and `aria-valuenow` are native.
 */
export const Progress = ProgressImpl as ForwardRefExoticComponent<
  ProgressProps & RefAttributes<HTMLDivElement>
>;

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import {
  delayedFadeIn,
  delayStyle,
  Spinner,
  type SpinnerSize,
  type SpinnerTone,
  spinnerSizes,
  spinnerTones,
} from "../spinner/spinner.js";

const VARIANT = {
  inline: "inline-flex align-middle",
  section: "flex w-full min-h-32 p-6",
  page: "flex w-full flex-1 min-h-[60vh] p-8",
} as const;

const PLACEMENT = {
  end: "flex-row gap-2",
  bottom: "flex-col gap-3",
  hidden: "",
} as const;

export type LoadingVariant = keyof typeof VARIANT;

export interface LoadingIndicatorProps {
  /** Default `sm` inline, `lg` in a section or page or around a `logo`. */
  size?: SpinnerSize;
  /** Default `current` inline (the text colour), `default` (primary) in a section or page. */
  tone?: SpinnerTone;
  /**
   * A logo or image shown in the middle of the spinner (`<img>`, `<svg>`, an `Avatar`). It fills a
   * circle inside the ring. The logo stays upright and readable; only the ring moves.
   */
  logo?: ReactNode;
  /** `ring` (default): a ring spins around the logo. `pulse`: no ring; the logo fades in and out. */
  animation?: "ring" | "pulse";
}

export interface LoadingProps
  extends LoadingIndicatorProps,
    Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The message, shown and announced. Default `"Loading…"`. */
  label?: string;
  /** Default `end` (beside the spinner) inline, `bottom` in a section or page. `hidden` keeps it for screen readers only. */
  labelPlacement?: keyof typeof PLACEMENT;
  /**
   * `inline` (default) sits in a line of content. `section` fills its container, for a
   * `<Suspense fallback>`. `page` fills the content area, for a Next.js `loading.tsx`.
   */
  variant?: LoadingVariant;
  /**
   * Milliseconds to stay invisible before fading in, so a fast load never flashes it. Default 0
   * inline, 200 in a section or page. Pure CSS, so it works in a Server Component.
   */
  delay?: number;
}

/** The spinner, or a logo with a ring spinning around it (or pulsing). Decorative. */
export function LoadingIndicator({ size, tone, logo, animation = "ring" }: LoadingIndicatorProps) {
  if (!logo) return <Spinner size={size ?? "sm"} tone={tone} />;
  const box = spinnerSizes[size ?? "lg"];
  return (
    <span
      aria-hidden="true"
      data-slot="loading-indicator"
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        box,
        spinnerTones[tone ?? "current"],
      )}
    >
      {animation === "ring" && <Spinner className="absolute inset-0 size-full" />}
      <span
        data-slot="loading-logo"
        data-motion={animation === "pulse" ? "essential" : undefined}
        className={cn(
          "grid place-items-center overflow-hidden rounded-full [&>img]:size-full [&>img]:object-contain [&>svg]:size-full",
          animation === "ring" ? "size-[62%]" : "size-full animate-pulse",
        )}
      >
        {logo}
      </span>
    </span>
  );
}

/**
 * A loading message with a spinner, announced once as a polite status. A Server Component, so
 * it can be a `loading.tsx` or a Suspense fallback with no client JavaScript. For content that
 * stays on screen while it refetches, use `LoadingOverlay` from `@azmr/ui/loading/client`.
 */
export const Loading = forwardRef<HTMLElement, LoadingProps>(function Loading(
  {
    label = "Loading…",
    labelPlacement,
    variant = "inline",
    size,
    tone,
    logo,
    animation,
    delay,
    className,
    style,
    ...props
  },
  ref,
) {
  const inline = variant === "inline";
  const placement = labelPlacement ?? (inline ? "end" : "bottom");
  const wait = delay ?? (inline ? 0 : 200);
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      ref={ref as never}
      role="status"
      data-slot="loading"
      data-variant={variant}
      className={cn(
        "items-center justify-center text-muted-foreground",
        VARIANT[variant],
        PLACEMENT[placement],
        wait > 0 && delayedFadeIn,
        className,
      )}
      style={delayStyle(wait, style)}
      {...props}
    >
      <LoadingIndicator
        size={size ?? (inline && !logo ? "sm" : "lg")}
        tone={tone ?? (inline ? "current" : "default")}
        logo={logo}
        animation={animation}
      />
      <span className={placement === "hidden" ? "sr-only" : "text-sm"}>{label}</span>
    </Tag>
  );
});

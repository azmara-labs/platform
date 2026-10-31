import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { LoadingIndicator, type LoadingIndicatorProps } from "../loading/loading.js";
import { type LoadingStateOptions, useLoadingState } from "./use-loading-state.js";

export interface LoadingOverlayProps
  extends LoadingIndicatorProps,
    LoadingStateOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** True while the content is being refetched. Shows after `delay`, for at least `minDuration`. */
  active: boolean;
  /** The content that stays on screen, dimmed, while `active`. */
  children: ReactNode;
  /** The message, shown and announced when the overlay appears. Default `"Loading…"`. */
  label?: string;
  /** `bottom` (default) under the spinner, `end` beside it, `hidden` for screen readers only. */
  labelPlacement?: "end" | "bottom" | "hidden";
}

/**
 * Keeps content on screen while it refetches: the content dims, the region is `aria-busy`, and a
 * spinner with a message sits over it. The status region is always in the page (empty while idle),
 * so screen readers announce the message when it appears.
 */
export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  function LoadingOverlay(
    {
      active,
      children,
      label = "Loading…",
      labelPlacement = "bottom",
      delay,
      minDuration,
      size,
      tone = "default",
      logo,
      animation,
      className,
      ...props
    },
    ref,
  ) {
    const visible = useLoadingState(active, { delay, minDuration });
    return (
      <div
        ref={ref}
        data-slot="loading-overlay"
        data-active={visible ? "" : undefined}
        aria-busy={visible || undefined}
        className={cn("relative", className)}
        {...props}
      >
        <div
          data-slot="loading-overlay-content"
          className={cn("transition-opacity", visible && "opacity-50")}
        >
          {children}
        </div>
        {visible && (
          <div
            aria-hidden="true"
            data-slot="loading-overlay-indicator"
            className={cn(
              "absolute inset-0 z-10 flex items-center justify-center bg-background/40 text-muted-foreground motion-fade-in",
              labelPlacement === "bottom" ? "flex-col gap-3" : "flex-row gap-2",
            )}
          >
            <LoadingIndicator size={size ?? "lg"} tone={tone} logo={logo} animation={animation} />
            {labelPlacement !== "hidden" && <span className="text-sm">{label}</span>}
          </div>
        )}
        <span role="status" className="sr-only">
          {visible ? label : ""}
        </span>
      </div>
    );
  },
);

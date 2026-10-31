import { forwardRef, type HTMLAttributes, useEffect, useState } from "react";
import { cn } from "../../lib/cn.js";
import { type ProgressTone, progressTones } from "../progress/tones.js";
import { useLoadingState } from "./use-loading-state.js";

/** How far the bar creeps on its own: it slows as it nears this, and never reaches it. */
export const LOADING_BAR_CEILING = 90;
const START = 8;
const TICK_MS = 250;
const TICK_SHARE = 0.12;
/** Time to fill the last stretch to 100%, then to fade out, when loading ends. */
const FILL_MS = 200;
const FADE_MS = 300;

type Phase = "idle" | "running" | "filling" | "fading";

export interface LoadingBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "aria-label"> {
  /** True while loading. The bar creeps towards 90%, then fills and fades out when it turns false. */
  loading: boolean;
  /** The real progress (0 to 100), when it is known. Replaces the creep; omit or `null` when it is not. */
  value?: number | null;
  /** Milliseconds `loading` must stay true before the bar shows, so a fast load shows nothing. Default 150. */
  delay?: number;
  /** Default `default` (primary). */
  tone?: ProgressTone;
  /** Accessible name. Default `"Loading"`. */
  "aria-label"?: string;
}

/**
 * A thin progress bar fixed to the top of the page, for navigation and other page-wide loading
 * (like GitHub's). Framework-agnostic: drive `loading` from your router or a transition.
 * The fill moves with `transform: scaleX`, never `width`.
 */
export const LoadingBar = forwardRef<HTMLDivElement, LoadingBarProps>(function LoadingBar(
  {
    loading,
    value = null,
    delay = 150,
    tone = "default",
    "aria-label": ariaLabel = "Loading",
    className,
    style,
    ...props
  },
  ref,
) {
  const visible = useLoadingState(loading, { delay, minDuration: 0 });
  const [phase, setPhase] = useState<Phase>("idle");
  const [creep, setCreep] = useState(0);
  const known = value !== null && Number.isFinite(value);

  // Start when shown; when hidden, fill to 100% (if it was showing at all).
  useEffect(() => {
    if (visible) {
      setPhase("running");
      setCreep(START);
    } else {
      setPhase((current) => (current === "idle" ? current : "filling"));
    }
  }, [visible]);

  // Filling, then fading, then gone.
  useEffect(() => {
    if (phase !== "filling" && phase !== "fading") return;
    const timer = setTimeout(
      () => setPhase(phase === "filling" ? "fading" : "idle"),
      phase === "filling" ? FILL_MS : FADE_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  // Creep towards the ceiling while running with no known value.
  useEffect(() => {
    if (phase !== "running" || known) return;
    const timer = setInterval(
      () => setCreep((p) => p + (LOADING_BAR_CEILING - p) * TICK_SHARE),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [phase, known]);

  if (phase === "idle") return null;

  const running = phase === "running";
  const shown = running ? (known ? Math.min(100, Math.max(0, value as number)) : creep) : 100;

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={running && known ? Math.round(shown) : undefined}
      aria-busy={running || undefined}
      data-slot="loading-bar"
      data-state={phase}
      className={cn("pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5", className)}
      style={style}
      {...props}
    >
      <div
        data-slot="loading-bar-fill"
        className={cn(
          "h-full origin-left transition-[transform,opacity] duration-200 ease-out",
          progressTones[tone].indicator,
          phase === "fading" && "opacity-0 duration-300",
        )}
        style={{ transform: `scaleX(${shown / 100})` }}
      />
    </div>
  );
});

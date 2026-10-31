import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { CircleAlert, Inbox } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Loading, type LoadingIndicatorProps } from "../loading/loading.js";

export type StateViewState = "loading" | "empty" | "error";

const DEFAULTS = {
  loading: { title: "Loading…", icon: null },
  empty: { title: "Nothing here yet", icon: Inbox },
  error: { title: "Something went wrong", icon: CircleAlert },
} as const;

const VARIANT = {
  section: "min-h-32 p-6",
  page: "flex-1 min-h-[60vh] p-8",
} as const;

export interface StateViewProps
  extends Pick<LoadingIndicatorProps, "logo">,
    Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Which state to show. */
  state: StateViewState;
  /**
   * The headline. Defaults: "Loading…", "Nothing here yet", "Something went wrong". Generic on
   * purpose: never put a raw error message here, it can carry personal or internal details.
   */
  title?: string;
  /** A sentence under the title: what happened, or what to do next. */
  description?: ReactNode;
  /** Replaces the default icon (inbox for empty, alert for error). `null` shows none. Ignored while loading. */
  icon?: ReactNode;
  /** A button or link: "Try again", "Create your first invoice". Not shown while loading. */
  action?: ReactNode;
  /** `section` (default) fills its container; `page` fills the content area. */
  variant?: keyof typeof VARIANT;
  /** The title's element, to fit the page's heading outline. Default `h2`. */
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Loading only: milliseconds before it fades in. Default 200. */
  delay?: number;
}

/**
 * One layout for a region's loading, empty and error states, so every page handles them the same
 * way. A Server Component: use it in `loading.tsx`, `error.tsx`, a Suspense fallback or an empty
 * table. Loading is a polite status, an error is an alert, and empty is plain content.
 */
export const StateView = forwardRef<HTMLDivElement, StateViewProps>(function StateView(
  {
    state,
    title,
    description,
    icon,
    action,
    variant = "section",
    titleAs: Title = "h2",
    logo,
    delay,
    className,
    ...props
  },
  ref,
) {
  const text = title ?? DEFAULTS[state].title;

  if (state === "loading") {
    return (
      <Loading
        ref={ref}
        variant={variant}
        label={text}
        logo={logo}
        delay={delay}
        data-state="loading"
        className={className}
        {...props}
      />
    );
  }

  const shownIcon =
    icon === undefined ? <Icon icon={DEFAULTS[state].icon} size="xl" className="size-10" /> : icon;

  return (
    <div
      ref={ref}
      role={state === "error" ? "alert" : undefined}
      data-slot="state-view"
      data-state={state}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 text-center",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {shownIcon != null && (
        <span
          aria-hidden="true"
          data-slot="state-view-icon"
          className={cn(
            "grid place-items-center",
            state === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {shownIcon}
        </span>
      )}
      <Title data-slot="state-view-title" className="text-base font-semibold text-foreground">
        {text}
      </Title>
      {description != null && (
        <p data-slot="state-view-description" className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action != null && (
        <div data-slot="state-view-action" className="mt-1 flex flex-wrap justify-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
});

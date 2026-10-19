import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { STATUS, type StatusVariant } from "./status.js";

const DEFAULT_ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destructive: CircleAlert,
} as const;

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: StatusVariant;
  /** Replaces the default icon; `null` removes it. */
  icon?: ReactNode;
  /** Adds a dismiss button that calls this. The Alert does not hide itself: you own that state. */
  onDismiss?: () => void;
  /** The accessible name of the dismiss button. Default "Dismiss". */
  dismissLabel?: string;
}

/**
 * A status message. Problems (`warning`, `destructive`) are announced assertively with
 * `role="alert"`; `info` and `success` politely with `role="status"`. Server-safe: the dismiss
 * handler works when the Alert is rendered from a Client Component.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = "info", icon, onDismiss, dismissLabel = "Dismiss", className, children, ...props },
  ref,
) {
  const status = STATUS[variant];
  const role = variant === "warning" || variant === "destructive" ? "alert" : "status";
  return (
    <div
      ref={ref}
      role={role}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-lg border p-4 text-sm text-foreground",
        status.alert,
        onDismiss && "pr-11",
        className,
      )}
      {...props}
    >
      {icon === undefined ? (
        <Icon icon={DEFAULT_ICONS[variant]} className={cn("mt-0.5", status.icon)} />
      ) : (
        icon
      )}
      <div className="flex-1 space-y-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="absolute top-3 right-3 rounded-sm p-1 opacity-70 outline-none transition-opacity duration-(--motion-duration-fast) hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon icon={X} size="sm" />
        </button>
      )}
    </div>
  );
});

export const AlertTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AlertTitle({ className, ...props }, ref) {
    return <div ref={ref} className={cn("font-medium leading-none", className)} {...props} />;
  },
);

export const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AlertDescription({ className, ...props }, ref) {
    return <div ref={ref} className={cn("text-sm leading-relaxed", className)} {...props} />;
  },
);

import { forwardRef, type OlHTMLAttributes, type ReactNode } from "react";
import { Check, X } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";

export type StepStatus = "complete" | "current" | "upcoming" | "error";

export interface StepperStep {
  label: ReactNode;
  description?: ReactNode;
  /** Mark this step as failed. Otherwise the status follows `current`. */
  status?: "error";
}

export interface StepperProps extends Omit<OlHTMLAttributes<HTMLOListElement>, "children"> {
  steps: readonly StepperStep[];
  /** The index (0-based) of the step in progress. Below 0 nothing has started; past the end everything is done. */
  current: number;
  orientation?: "horizontal" | "vertical";
  /** The list's name. Default "Progress". */
  label?: string;
  /** The words spoken for each state, for translation. */
  statusLabels?: Partial<Record<StepStatus, string>>;
}

const STATUS_LABELS: Record<StepStatus, string> = {
  complete: "Completed",
  current: "Current step",
  upcoming: "Not started",
  error: "Error",
};

const INDICATOR: Record<StepStatus, string> = {
  complete: "border-primary bg-primary text-primary-foreground",
  current: "border-primary bg-background text-primary",
  upcoming: "border-border bg-background text-muted-foreground",
  error: "border-destructive bg-background text-destructive",
};

/**
 * Where someone is in a fixed sequence of steps. It is a status display, not navigation: steps are not
 * links. Each state is also said in text (screen-reader only), never by colour alone. Server-safe.
 */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    steps,
    current,
    orientation = "horizontal",
    label = "Progress",
    statusLabels,
    className,
    ...props
  },
  ref,
) {
  const words = { ...STATUS_LABELS, ...statusLabels };
  const horizontal = orientation === "horizontal";

  return (
    <ol
      ref={ref}
      aria-label={label}
      data-orientation={orientation}
      className={cn(horizontal ? "flex flex-row items-start" : "flex flex-col", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const status: StepStatus =
          step.status === "error"
            ? "error"
            : index < current
              ? "complete"
              : index === current
                ? "current"
                : "upcoming";
        const last = index === steps.length - 1;
        return (
          <li
            // The position is the identity: steps are a fixed sequence.
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed sequence
            key={index}
            data-status={status}
            aria-current={status === "current" ? "step" : undefined}
            className={cn(
              "flex",
              horizontal ? "flex-1 flex-row items-center last:flex-none" : "flex-col",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                data-azmr-step-indicator=""
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                  INDICATOR[status],
                )}
              >
                {status === "complete" ? (
                  <Icon icon={Check} />
                ) : status === "error" ? (
                  <Icon icon={X} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="grid text-left">
                <span className="sr-only">{words[status]}</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    status === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground">{step.description}</span>
                )}
              </span>
            </div>
            {!last && (
              <span
                data-azmr-step-connector=""
                aria-hidden="true"
                className={cn(
                  index < current ? "bg-primary" : "bg-border",
                  horizontal ? "mx-3 h-px min-w-6 flex-1" : "my-2 ml-4 min-h-6 w-px",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
});

import { STATUS_LABELS } from "../lib/component-index";
import type { ComponentStatus } from "../lib/component-taxonomy";

const STATUS_STYLES: Record<ComponentStatus, string> = {
  stable: "border-fd-border text-fd-muted-foreground",
  new: "border-fd-primary/40 bg-fd-primary/10 text-fd-primary",
  beta: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

/** A component's maturity as a labelled pill. The label is text, so it never relies on colour. */
export function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

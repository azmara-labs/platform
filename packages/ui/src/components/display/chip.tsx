import { X } from "lucide-react";
import { forwardRef } from "react";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Badge, type BadgeProps } from "./badge.js";

export interface ChipProps extends BadgeProps {
  /** Adds a remove button that calls this. The Chip does not hide itself: you own that state. */
  onRemove?: () => void;
  /** The accessible name of the remove button. Default `Remove <label>` for text labels. */
  removeLabel?: string;
}

/** A Badge that can be removed, such as a selected filter or a tag. Server-safe. */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { onRemove, removeLabel, className, children, ...props },
  ref,
) {
  const label = removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove");
  return (
    <Badge ref={ref} className={cn(onRemove && "pr-1", className)} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={label}
          onClick={onRemove}
          className="rounded-sm p-0.5 outline-none transition-colors duration-(--motion-duration-fast) hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon icon={X} size="xs" />
        </button>
      )}
    </Badge>
  );
});

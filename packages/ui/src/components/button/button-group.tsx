import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/cn.js";

type Named = { "aria-label": string } | { "aria-labelledby": string };

/**
 * The classes that join a row (or column) of buttons into one control: inner corners squared, one
 * shared border, and the hovered or focused button raised so a neighbour never hides its outline.
 * Spelled out in full so the Tailwind scanner finds them in `dist`. Shared with `ToggleGroup`.
 */
export function joinedClasses(orientation: "horizontal" | "vertical", attached: boolean) {
  if (!attached) return cn("inline-flex gap-2", orientation === "vertical" && "flex-col");
  return cn(
    "inline-flex [&>*]:relative [&>*:focus-visible]:z-10 [&>*:hover]:z-10",
    orientation === "vertical"
      ? "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px"
      : "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px",
  );
}

export type ButtonGroupProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "aria-label" | "aria-labelledby"
> &
  Named & {
    /** Lay the buttons out in a row (default) or a column. */
    orientation?: "horizontal" | "vertical";
    /** Join the buttons into one control (default), or keep them apart with a gap. */
    attached?: boolean;
  };

/**
 * A named group of related buttons, visually joined. It is only a grouping: Tab still visits every
 * button. For a group that behaves as one control with arrow keys and a pressed state, use
 * `ToggleGroup`. Server-safe.
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { orientation = "horizontal", attached = true, className, ...props },
  ref,
) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset brings a legend and default styling; a group of buttons is a plain role="group" container
    <div
      ref={ref}
      role="group"
      data-orientation={orientation}
      className={cn(joinedClasses(orientation, attached), className)}
      {...props}
    />
  );
});

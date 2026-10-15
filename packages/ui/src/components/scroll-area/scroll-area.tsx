import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { cn } from "../../lib/cn.js";
import { ScrollArea as ScrollAreaPrimitive } from "../../primitives/scroll-area.js";

export interface ScrollAreaOwnProps {
  /** Which scrollbars to show. Default `vertical`. */
  orientation?: "vertical" | "horizontal" | "both";
  /**
   * `hover` (default) fades the scrollbar in on hover and while scrolling, like the desktop
   * platforms; `always` keeps it visible.
   */
  scrollbar?: "always" | "hover";
  /** Keep the scrollbars in the DOM even when nothing overflows, so layout never jumps. */
  keepMounted?: boolean;
  /** Classes for the scrollable viewport (padding, for example); `className` styles the root. */
  viewportClassName?: string;
  /** A ref to the scrollable element, to read or set the scroll position. */
  viewportRef?: Ref<HTMLDivElement>;
  className?: string;
  children?: ReactNode;
}

/** A scrollable region is focusable, so it needs a name: a label or the id of a heading. */
type Named = { "aria-label": string } | { "aria-labelledby": string };

export type ScrollAreaProps = ScrollAreaOwnProps &
  Named &
  Omit<
    ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
    keyof ScrollAreaOwnProps | "aria-label" | "aria-labelledby"
  >;

function Scrollbar({
  orientation,
  always,
  keepMounted,
}: {
  orientation: "vertical" | "horizontal";
  always: boolean;
  keepMounted: boolean;
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      keepMounted={keepMounted}
      className={cn(
        "flex touch-none select-none p-px transition-opacity duration-(--motion-duration-fast) ease-standard",
        orientation === "vertical" ? "h-full w-2.5" : "h-2.5 flex-col",
        !always && "opacity-0 data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
      )}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

/**
 * A scrollable region with token-styled scrollbars. The viewport is a keyboard-focusable
 * `role="region"` (Tab to it, then the arrow keys and Page Up/Down scroll), so a name is required.
 */
const ScrollAreaImpl = forwardRef<
  HTMLDivElement,
  ScrollAreaOwnProps &
    Omit<ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>, keyof ScrollAreaOwnProps> & {
      "aria-label"?: string;
      "aria-labelledby"?: string;
    }
>(function ScrollArea(
  {
    orientation = "vertical",
    scrollbar = "hover",
    keepMounted = false,
    viewportClassName,
    viewportRef,
    className,
    children,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref,
) {
  const always = scrollbar === "always";
  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden rounded-md", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        role="region"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          viewportClassName,
        )}
      >
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && (
        <Scrollbar orientation="vertical" always={always} keepMounted={keepMounted} />
      )}
      {orientation !== "vertical" && (
        <Scrollbar orientation="horizontal" always={always} keepMounted={keepMounted} />
      )}
      {orientation === "both" && <ScrollAreaPrimitive.Corner />}
    </ScrollAreaPrimitive.Root>
  );
});

export const ScrollArea = ScrollAreaImpl as ForwardRefExoticComponent<
  ScrollAreaProps & RefAttributes<HTMLDivElement>
>;

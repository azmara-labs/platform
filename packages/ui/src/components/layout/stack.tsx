import {
  Children,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../lib/cn.js";
import { DIRECTION_CLASSES } from "./responsive.js";
import { type Responsive, responsiveClasses } from "./responsive-utils.js";
import {
  ALIGN_ITEMS_CLASSES,
  type AlignItems,
  GAP_CLASSES,
  type Gap,
  JUSTIFY_CONTENT_CLASSES,
  type JustifyContent,
  type LayoutElement,
} from "./scale.js";

export interface StackProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** `column` (default) or `row`, or one per breakpoint: `{ base: "column", md: "row" }`. */
  direction?: Responsive<"row" | "column">;
  /** The space between children, on the 4px scale (0 to 12), or `density` to follow the density token. */
  gap?: Gap;
  align?: AlignItems;
  justify?: JustifyContent;
  wrap?: boolean;
  /** An element placed between children (never before the first or after the last). */
  divider?: ReactNode;
  /** The element to render. Default `div`. */
  as?: LayoutElement;
  children?: ReactNode;
}

/** One-dimensional layout: children in a row or column with a consistent gap. Server-safe. */
export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  {
    direction = "column",
    gap = 0,
    align,
    justify,
    wrap,
    divider,
    as: Component = "div",
    className,
    children,
    ...props
  },
  ref,
) {
  const items = divider === undefined ? children : withDividers(children, divider);
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn(
        "flex",
        responsiveClasses(direction, DIRECTION_CLASSES),
        GAP_CLASSES[gap],
        align && ALIGN_ITEMS_CLASSES[align],
        justify && JUSTIFY_CONTENT_CLASSES[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    >
      {items}
    </Component>
  );
});

function withDividers(children: ReactNode, divider: ReactNode): ReactNode[] {
  // toArray drops null, undefined and booleans and gives every child a stable key.
  const items = Children.toArray(children);
  const out: ReactNode[] = [];
  items.forEach((child, index) => {
    // biome-ignore lint/suspicious/noArrayIndexKey: a divider's position is its identity; it has no state to preserve
    if (index > 0) out.push(<Fragment key={`divider-${index}`}>{divider}</Fragment>);
    out.push(child);
  });
  return out;
}

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../lib/cn.js";
import { COLS_CLASSES, SPAN_CLASSES } from "./responsive.js";
import { type Responsive, responsiveClasses } from "./responsive-utils.js";
import {
  ALIGN_ITEMS_CLASSES,
  type AlignItems,
  GAP_CLASSES,
  type Gap,
  JUSTIFY_ITEMS_CLASSES,
  type JustifyItems,
  type LayoutElement,
} from "./scale.js";

type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** A plain CSS length. It ends up in a style attribute, so nothing else is accepted. */
const CSS_LENGTH = /^\d+(?:\.\d+)?(?:px|rem|em|ch|vw|%)$/;

export interface GridProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Column count, or one per breakpoint: `{ base: 1, md: 3 }`. Default 1. */
  cols?: Responsive<ColumnCount>;
  /**
   * Fill the row with as many columns as fit, each at least this wide (`"16rem"`), instead of a
   * fixed count. Takes the place of `cols`.
   */
  minItemWidth?: string;
  gap?: Gap;
  /** Vertical alignment of items within their cell. */
  align?: AlignItems;
  /** Horizontal alignment of items within their cell. */
  justify?: JustifyItems;
  as?: LayoutElement;
  children?: ReactNode;
}

/**
 * CSS grid with a responsive column count. This is not MUI's 12-column item system: for that,
 * use `cols={12}` and give children a `GridItem` with `span`. Server-safe.
 */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  {
    cols = 1,
    minItemWidth,
    gap = 0,
    align,
    justify,
    as: Component = "div",
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  if (minItemWidth !== undefined && !CSS_LENGTH.test(minItemWidth)) {
    throw new Error(
      `Grid: minItemWidth must be a plain CSS length like "16rem" or "240px", got ${JSON.stringify(minItemWidth)}`,
    );
  }
  const autoFit = minItemWidth !== undefined;
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn(
        "grid",
        autoFit
          ? "grid-cols-[repeat(auto-fit,minmax(min(100%,var(--azmr-grid-min)),1fr))]"
          : responsiveClasses(cols, COLS_CLASSES),
        GAP_CLASSES[gap],
        align && ALIGN_ITEMS_CLASSES[align],
        justify && JUSTIFY_ITEMS_CLASSES[justify],
        className,
      )}
      style={autoFit ? ({ "--azmr-grid-min": minItemWidth, ...style } as CSSProperties) : style}
      {...props}
    >
      {children}
    </Component>
  );
});

type SpanValue = ColumnCount | "full";

export interface GridItemProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Columns to span, or one per breakpoint: `{ base: 12, md: 6 }`. `"full"` spans every column. */
  span?: Responsive<SpanValue>;
  as?: LayoutElement;
  children?: ReactNode;
}

/** A grid cell that spans columns. The replacement for MUI's `<Grid item xs md>`. */
export const GridItem = forwardRef<HTMLElement, GridItemProps>(function GridItem(
  { span, as: Component = "div", className, children, ...props },
  ref,
) {
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn(responsiveClasses(span, SPAN_CLASSES), className)}
      {...props}
    >
      {children}
    </Component>
  );
});

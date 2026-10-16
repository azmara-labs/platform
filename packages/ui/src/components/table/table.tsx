import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn.js";

type Align = "left" | "center" | "right";
const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /**
   * Names the scrolling container. When set it becomes a labelled, focusable region, so a keyboard
   * user can scroll a table that is wider than its space. Give a wide table a label.
   */
  label?: string;
  /** Classes for the scrolling container, such as a `max-h-96` so the table scrolls vertically. */
  containerClassName?: string;
  /** Keep the header row in view while the body scrolls. Give the container a height. */
  stickyHeader?: boolean;
  /** Tint every other body row. */
  striped?: boolean;
  /** Tint the row under the pointer. */
  hoverable?: boolean;
}

/**
 * A semantic, non-interactive table. It is a native `<table>`, so it already has the table, row and
 * cell roles; name it with a `TableCaption`. Server-safe.
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { label, containerClassName, stickyHeader, striped, hoverable, className, ...props },
  ref,
) {
  return (
    <div
      // A named, focusable region only when labelled; otherwise a plain container.
      {...(label ? { role: "region", "aria-label": label, tabIndex: 0 } : {})}
      className={cn(
        "relative w-full overflow-x-auto",
        label &&
          "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        stickyHeader && "overflow-y-auto",
        containerClassName,
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom border-collapse text-sm",
          stickyHeader &&
            "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-background [&_thead_th]:shadow-[inset_0_-1px_0_0_var(--color-border)]",
          striped && "[&_tbody_tr:nth-child(even)]:bg-muted/50",
          hoverable && "[&_tbody_tr:hover]:bg-muted/50",
          className,
        )}
        {...props}
      />
    </div>
  );
});

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />;
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
});

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
});

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Marks the row as selected (`data-selected`) and tints it. */
  selected?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected, className, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      data-selected={selected ? "" : undefined}
      className={cn(
        "h-(--density-row-height) border-b border-border transition-colors data-[selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
});

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Horizontal alignment. Default `left`. */
  align?: Align;
}

/** A header cell. `scope="col"` by default; use `scope="row"` for the first cell of a row. */
export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { scope = "col", align = "left", className, ...props },
  ref,
) {
  return (
    <th
      ref={ref}
      scope={scope}
      className={cn(
        "px-3 text-left align-middle font-medium text-muted-foreground",
        ALIGN[align],
        className,
      )}
      {...props}
    />
  );
});

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  /** Right-aligns and uses tabular figures, so a column of numbers lines up. */
  numeric?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align, numeric, className, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={cn(
        "px-3 py-2 align-middle",
        numeric && "text-right tabular-nums",
        align && ALIGN[align],
        className,
      )}
      {...props}
    />
  );
});

export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  /** Hide the caption visually but keep it as the table's name. */
  srOnly?: boolean;
}

/** The table's name. Prefer a visible caption; `srOnly` keeps it for assistive technology only. */
export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  function TableCaption({ srOnly, className, ...props }, ref) {
    return (
      <caption
        ref={ref}
        className={cn(
          "mt-4 caption-bottom text-sm text-muted-foreground",
          srOnly && "sr-only",
          className,
        )}
        {...props}
      />
    );
  },
);

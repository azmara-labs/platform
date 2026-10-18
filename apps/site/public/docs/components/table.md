# Table

> A semantic, non-interactive table with a caption, sticky header, striping and a named scroll region. Server-safe.

Source: https://platform.azmara.io/docs/components/table

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
} from "@azmr/ui/table";
```

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@azmr/ui/table";

const invoices = [
  { id: "INV-001", status: "Paid", amount: 250 },
  { id: "INV-002", status: "Pending", amount: 1250 },
  { id: "INV-003", status: "Paid", amount: 480.5 },
  { id: "INV-004", status: "Overdue", amount: 90 },
];

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

export default function TableBasic() {
  const total = invoices.reduce((sum, i) => sum + i.amount, 0);
  return (
    <Table striped hoverable className="max-w-xl">
      <TableCaption>Invoices for October</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableHead scope="row" className="font-normal text-foreground">
              {invoice.id}
            </TableHead>
            <TableCell>{invoice.status}</TableCell>
            <TableCell numeric>{nzd.format(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell numeric>{nzd.format(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
```

`Table` is a native `<table>`, so it already has the table, row and column roles with no ARIA added. It is a Server Component: no hooks, no `"use client"`. It replaces hand-built `Table*` markup (for example MUI's `TableCell`) with the same structure and sensible styling from tokens.

Name every table with a `TableCaption`. Use `srOnly` to keep it for assistive technology and hide it visually.

## Header cells

`TableHead` is a `<th>`. It defaults to `scope="col"`. For the first cell of a row (a row header), pass `scope="row"`, as in the demo, so a screen reader announces the row's name with each value. Put `aria-sort` on a header cell when the column is sorted.

## Numbers and alignment

`TableCell numeric` right-aligns and uses tabular figures, so a column of amounts lines up. `align` (`left`, `center`, `right`) works on both `TableHead` and `TableCell`: align a numeric column's header the same way as its cells.

## Scrolling and the sticky header

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@azmr/ui/table";

const rows = Array.from({ length: 24 }, (_, i) => ({
  id: `CUST-${String(i + 1).padStart(3, "0")}`,
  name: ["Aroha Ngata", "Tane Walker", "Mere Parata", "Hemi Rangi"][i % 4],
  city: ["Hamilton", "Auckland", "Wellington", "Dunedin"][i % 4],
  orders: (i * 7) % 31,
}));

export default function TableSticky() {
  return (
    <Table
      label="Customers (scrollable)"
      stickyHeader
      hoverable
      containerClassName="max-h-64 max-w-xl rounded-md border border-border"
    >
      <TableCaption srOnly>Customers, with their city and order count</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>City</TableHead>
          <TableHead align="right">Orders</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.id}</TableCell>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.city}</TableCell>
            <TableCell numeric>{r.orders}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

A table wider than its space scrolls **inside its own container**, so it never breaks the page. Give the table a `label` and the container becomes a named, focusable region, so a keyboard user can scroll it with the arrow keys. Do this for any table that may overflow.

`stickyHeader` keeps the header row in view while the body scrolls; give the container a height with `containerClassName` (such as `max-h-64`). The header cells sit on an opaque background, so rows slide cleanly beneath them.

## Striped, hoverable, selected

`striped` tints every other body row and `hoverable` tints the row under the pointer. `TableRow selected` marks a row with `data-selected` and tints it. These are styling only: a hover tint is not interactive, and a selected row is not announced as selected unless you also make it a control (for example with a checkbox in the row).

Rows follow the density token (`--density-row-height`), so a table grows or shrinks with `data-density`.

## Not a data grid

This is a presentational table. Sorting, filtering, selection, virtualised rows and editing belong to the data grid (Phase 4), which builds on this.

## Props

| Prop                 | Type                   | Default | Required | Description                                                                                                                                                                     |
| -------------------- | ---------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`              | `string`               |         | No       | Names the scrolling container. When set it becomes a labelled, focusable region, so a keyboard user can scroll a table that is wider than its space. Give a wide table a label. |
| `containerClassName` | `string`               |         | No       | Classes for the scrolling container, such as a `max-h-96` so the table scrolls vertically.                                                                                      |
| `stickyHeader`       | `boolean \| undefined` |         | No       | Keep the header row in view while the body scrolls. Give the container a height.                                                                                                |
| `striped`            | `boolean \| undefined` |         | No       | Tint every other body row.                                                                                                                                                      |
| `hoverable`          | `boolean \| undefined` |         | No       | Tint the row under the pointer.                                                                                                                                                 |

## Accessibility

- Native table semantics: `table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`. Nothing is overridden.
- A caption names the table; row headers use `scope="row"`.
- The scroll container, when labelled, is a `region` with a tab stop and a full-strength focus ring.
- Striping and hover tints are never the only way information is conveyed.

| Key                                                     | Action                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Tab`                                                   | Moves to the scroll region when the table has a label. Nothing else in a static table is focusable. |
| `ArrowDown` or `ArrowUp` or `ArrowRight` or `ArrowLeft` | Scrolls a focused, labelled region.                                                                 |
| `PageDown` or `PageUp` or `Home` or `End`               | Scrolls by a page, or to the start or end.                                                          |

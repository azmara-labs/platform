import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

function Demo(props: Partial<React.ComponentProps<typeof Table>> = {}) {
  return (
    <Table {...props}>
      <TableCaption>Invoices this month</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">INV-001</TableHead>
          <TableCell>Paid</TableCell>
          <TableCell numeric>$250.00</TableCell>
        </TableRow>
        <TableRow selected>
          <TableHead scope="row">INV-002</TableHead>
          <TableCell>Pending</TableCell>
          <TableCell numeric>$1,250.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell numeric>$1,500.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe("Table: semantics", () => {
  it("is a native table with a caption, header, body and footer", () => {
    const { container } = renderUi(<Demo />);
    const table = container.querySelector("table") as HTMLTableElement;
    expect(table.querySelector("caption")?.textContent).toBe("Invoices this month");
    expect(table.querySelector("thead tr th")).not.toBeNull();
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(table.querySelector("tfoot td")?.textContent).toBe("Total");
    // No ARIA overrides: the native elements already carry the table roles.
    expect(table.hasAttribute("role")).toBe(false);
    expect(table.querySelector("[role]")).toBeNull();
  });

  it("column headers default to scope=col; a header cell in a row can be scope=row", () => {
    const { container } = renderUi(<Demo />);
    const heads = Array.from(container.querySelectorAll("th"));
    expect(heads.slice(0, 3).map((h) => h.getAttribute("scope"))).toEqual(["col", "col", "col"]);
    expect(heads[3]?.getAttribute("scope")).toBe("row");
  });

  it("passes aria-sort through for a sortable column", () => {
    const { container } = renderUi(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort="ascending">Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    expect(container.querySelector("th")?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("the caption can be visually hidden but still read", () => {
    const { container } = renderUi(
      <Table>
        <TableCaption srOnly>Hidden caption</TableCaption>
      </Table>,
    );
    expect(classes(container.querySelector("caption"))).toContain("sr-only");
    expect(container.querySelector("caption")?.textContent).toBe("Hidden caption");
  });

  it("colSpan and other native attributes pass through", () => {
    const { container } = renderUi(<Demo />);
    expect(container.querySelector("tfoot td")?.getAttribute("colspan")).toBe("2");
  });

  it("forwards refs and merges className on every part", () => {
    const ref = createRef<HTMLTableElement>();
    const { container } = renderUi(
      <Table ref={ref} className="my-table">
        <TableBody>
          <TableRow className="my-row">
            <TableCell className="my-cell">x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(ref.current).toBe(container.querySelector("table"));
    expect(classes(container.querySelector("table"))).toContain("my-table");
    expect(classes(container.querySelector("tr"))).toContain("my-row");
    expect(classes(container.querySelector("td"))).toContain("my-cell");
  });
});

describe("Table: scrolling region", () => {
  it("scrolls sideways inside its own container so a wide table never breaks the page", () => {
    const { container } = renderUi(<Demo />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(classes(wrapper)).toEqual(
      expect.arrayContaining(["relative", "w-full", "overflow-x-auto"]),
    );
    expect(wrapper.contains(container.querySelector("table"))).toBe(true);
  });

  it("with a label the container is a named, focusable region (so keyboard users can scroll it)", () => {
    const { container } = renderUi(<Demo label="Invoices" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("role")).toBe("region");
    expect(wrapper.getAttribute("aria-label")).toBe("Invoices");
    expect(wrapper.getAttribute("tabindex")).toBe("0");
    expect(classes(wrapper)).toContain("focus-visible:ring-2");
  });

  it("without a label the container is not a landmark and not a tab stop", () => {
    const { container } = renderUi(<Demo />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.hasAttribute("role")).toBe(false);
    expect(wrapper.hasAttribute("tabindex")).toBe(false);
  });

  it("containerClassName styles the container (give it a height to scroll vertically)", () => {
    const { container } = renderUi(<Demo containerClassName="max-h-64" />);
    expect(classes(container.firstElementChild)).toContain("max-h-64");
  });
});

describe("Table: styling", () => {
  it("sticky header pins the header cells to the top of the container, on an opaque surface", () => {
    const { container } = renderUi(<Demo stickyHeader />);
    expect(classes(container.querySelector("table"))).toEqual(
      expect.arrayContaining([
        "[&_thead_th]:sticky",
        "[&_thead_th]:top-0",
        "[&_thead_th]:z-10",
        "[&_thead_th]:bg-background",
      ]),
    );
    expect(classes(container.firstElementChild)).toContain("overflow-y-auto");
  });

  it("is not sticky by default", () => {
    const { container } = renderUi(<Demo />);
    expect(classes(container.querySelector("table"))).not.toContain("[&_thead_th]:sticky");
    expect(classes(container.firstElementChild)).not.toContain("overflow-y-auto");
  });

  it("striped and hoverable are opt-in", () => {
    const plain = renderUi(<Demo />);
    expect(classes(plain.container.querySelector("table"))).not.toContain(
      "[&_tbody_tr:nth-child(even)]:bg-muted/50",
    );
    plain.unmount();
    const { container } = renderUi(<Demo striped hoverable />);
    expect(classes(container.querySelector("table"))).toEqual(
      expect.arrayContaining([
        "[&_tbody_tr:nth-child(even)]:bg-muted/50",
        "[&_tbody_tr:hover]:bg-muted/50",
      ]),
    );
  });

  it("rows follow the density token and have a bottom border", () => {
    const { container } = renderUi(<Demo />);
    expect(classes(container.querySelector("tbody tr"))).toEqual(
      expect.arrayContaining(["h-(--density-row-height)", "border-b", "border-border"]),
    );
  });

  it("a selected row is marked for styling and uses a token surface", () => {
    const { container } = renderUi(<Demo />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[1]?.hasAttribute("data-selected")).toBe(true);
    expect(rows[0]?.hasAttribute("data-selected")).toBe(false);
    expect(classes(rows[1] ?? null)).toContain("data-[selected]:bg-muted");
  });

  it("header cells are muted, medium weight and left-aligned; align and numeric move a column", () => {
    const { container } = renderUi(<Demo />);
    const heads = Array.from(container.querySelectorAll("thead th"));
    expect(classes(heads[0] ?? null)).toEqual(
      expect.arrayContaining(["text-left", "font-medium", "text-muted-foreground"]),
    );
    expect(classes(heads[2] ?? null)).toContain("text-right");
    const amount = container.querySelector("tbody tr td:last-child");
    expect(classes(amount)).toEqual(expect.arrayContaining(["text-right", "tabular-nums"]));
  });

  it("the footer is set apart and emphasised", () => {
    const { container } = renderUi(<Demo />);
    expect(classes(container.querySelector("tfoot"))).toEqual(
      expect.arrayContaining(["border-t", "bg-muted/50", "font-medium"]),
    );
  });

  it("caption sits below the table, muted", () => {
    const { container } = renderUi(<Demo />);
    expect(classes(container.querySelector("caption"))).toEqual(
      expect.arrayContaining(["caption-bottom", "text-muted-foreground", "text-sm"]),
    );
  });
});

describe("Table: accessibility", () => {
  it("passes axe with caption, header, row headers and footer", async () => {
    const { container } = renderUi(<Demo label="Invoices" />);
    await expectNoA11yViolations(container);
  });

  it("passes axe when striped, hoverable and sticky", async () => {
    const { container } = renderUi(<Demo striped hoverable stickyHeader />);
    await expectNoA11yViolations(container);
  });
});

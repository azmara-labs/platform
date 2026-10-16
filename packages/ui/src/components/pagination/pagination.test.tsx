import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Pagination } from "./pagination.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const items = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("li > a, li > button, li > span")) as HTMLElement[];
const labelOf = (el: Element | null) => el?.getAttribute("aria-label") ?? el?.textContent?.trim();
const current = (container: HTMLElement) =>
  container.querySelector("[aria-current=page]") as HTMLElement | null;

describe("Pagination: structure", () => {
  it("is a navigation landmark named Pagination, with a list", () => {
    const { container } = renderUi(
      <Pagination page={3} pageCount={10} hrefFor={(p) => `?page=${p}`} />,
    );
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.getAttribute("aria-label")).toBe("Pagination");
    expect(nav.querySelector("ul")).not.toBeNull();
  });

  it("the landmark can be renamed", () => {
    const { container } = renderUi(
      <Pagination label="Results pages" page={1} pageCount={3} hrefFor={(p) => `?${p}`} />,
    );
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Results pages");
  });

  it("marks the current page, and only that one", () => {
    const { container } = renderUi(
      <Pagination page={3} pageCount={10} hrefFor={(p) => `?page=${p}`} />,
    );
    expect(container.querySelectorAll("[aria-current=page]")).toHaveLength(1);
    expect(current(container)?.textContent).toBe("3");
  });

  it("each page has a name that says which page it is", () => {
    const { container } = renderUi(
      <Pagination page={1} pageCount={3} hrefFor={(p) => `?page=${p}`} />,
    );
    expect(items(container).map(labelOf)).toEqual([
      "Previous page",
      "Page 1",
      "Page 2",
      "Page 3",
      "Next page",
    ]);
  });

  it("shows an ellipsis for skipped pages, announced as more pages", () => {
    const { container } = renderUi(
      <Pagination page={1} pageCount={20} hrefFor={(p) => `?page=${p}`} />,
    );
    const ellipsis = container.querySelector("[data-azmr-ellipsis]") as HTMLElement;
    expect(ellipsis.textContent).toContain("More pages");
    expect(ellipsis.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(ellipsis.closest("a, button")).toBeNull();
  });

  it("renders nothing when there are no pages", () => {
    const { container } = renderUi(<Pagination page={1} pageCount={0} hrefFor={(p) => `?${p}`} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("uses the siblingCount and boundaryCount options", () => {
    const { container } = renderUi(
      <Pagination page={10} pageCount={20} siblingCount={2} hrefFor={(p) => `?${p}`} />,
    );
    const pages = items(container)
      .map(labelOf)
      .filter((l) => /^Page \d+$/.test(l ?? ""))
      .map((l) => Number(l?.slice(5)));
    expect(pages).toEqual([1, 8, 9, 10, 11, 12, 20]);
  });

  it("can hide the previous and next controls", () => {
    const { container } = renderUi(
      <Pagination page={2} pageCount={4} showPrevNext={false} hrefFor={(p) => `?${p}`} />,
    );
    expect(items(container).map(labelOf)).toEqual(["Page 1", "Page 2", "Page 3", "Page 4"]);
  });
});

describe("Pagination: as links (server-friendly)", () => {
  it("renders real links to each page", () => {
    const { container } = renderUi(
      <Pagination page={2} pageCount={4} hrefFor={(p) => `/items?page=${p}`} />,
    );
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/items?page=1",
      "/items?page=1",
      "/items?page=2",
      "/items?page=3",
      "/items?page=4",
      "/items?page=3",
    ]);
  });

  it("previous is disabled on the first page: no href, announced as disabled, not a tab stop", () => {
    const { container } = renderUi(<Pagination page={1} pageCount={4} hrefFor={(p) => `?${p}`} />);
    const prev = container.querySelector("[aria-label='Previous page']") as HTMLElement;
    expect(prev.hasAttribute("href")).toBe(false);
    expect(prev.getAttribute("aria-disabled")).toBe("true");
    expect(classes(prev)).toContain("pointer-events-none");
  });

  it("next is disabled on the last page", () => {
    const { container } = renderUi(<Pagination page={4} pageCount={4} hrefFor={(p) => `?${p}`} />);
    const next = container.querySelector("[aria-label='Next page']") as HTMLElement;
    expect(next.hasAttribute("href")).toBe(false);
    expect(next.getAttribute("aria-disabled")).toBe("true");
  });

  it("a disabled end stays a non-link even with a router link (it must not navigate to page 0 or past the end)", () => {
    const router = (href: string) => (
      <a data-router="" href={href}>
        Page
      </a>
    );
    const first = renderUi(
      <Pagination page={1} pageCount={3} hrefFor={(p) => `?${p}`} renderLink={router} />,
    );
    const prev = first.container.querySelector("[aria-label='Previous page']") as HTMLElement;
    expect(prev.hasAttribute("href")).toBe(false);
    expect(prev.getAttribute("aria-disabled")).toBe("true");
    expect(prev.hasAttribute("data-router")).toBe(false);
    first.unmount();
    const last = renderUi(
      <Pagination page={3} pageCount={3} hrefFor={(p) => `?${p}`} renderLink={router} />,
    );
    const next = last.container.querySelector("[aria-label='Next page']") as HTMLElement;
    expect(next.hasAttribute("href")).toBe(false);
    expect(next.getAttribute("aria-disabled")).toBe("true");
  });

  it("can use your router's link", () => {
    const { container } = renderUi(
      <Pagination
        page={1}
        pageCount={3}
        hrefFor={(p) => `?${p}`}
        renderLink={(href) => (
          <a data-router="" href={href}>
            Page
          </a>
        )}
      />,
    );
    expect(container.querySelectorAll("a[data-router]").length).toBeGreaterThan(0);
  });
});

describe("Pagination: as buttons (client state)", () => {
  function Stateful(props: { onChange?: (p: number) => void }) {
    const [page, setPage] = useState(1);
    return (
      <Pagination
        page={page}
        pageCount={5}
        onPageChange={(p) => {
          setPage(p);
          props.onChange?.(p);
        }}
      />
    );
  }

  it("clicking a page reports it and moves the current page", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    const { container } = renderUi(<Stateful onChange={onChange} />);
    await user.click(container.querySelector("[aria-label='Page 3']") as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(3);
    expect(current(container)?.textContent).toBe("3");
  });

  it("previous and next step by one, and are disabled at the ends", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stateful />);
    const prev = () => container.querySelector("[aria-label='Previous page']") as HTMLButtonElement;
    const next = () => container.querySelector("[aria-label='Next page']") as HTMLButtonElement;
    expect(prev().disabled).toBe(true);
    await user.click(next());
    expect(current(container)?.textContent).toBe("2");
    await user.click(prev());
    expect(current(container)?.textContent).toBe("1");
    for (let i = 0; i < 4; i++) await user.click(next());
    expect(current(container)?.textContent).toBe("5");
    expect(next().disabled).toBe(true);
  });

  it("pressing the current page does nothing", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    const { container } = renderUi(<Stateful onChange={onChange} />);
    await user.click(current(container) as HTMLElement);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keyboard: Tab walks the controls and Enter or Space activates", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    renderUi(<Stateful onChange={onChange} />);
    await user.tab(); // previous is disabled, so the first stop is page 1
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Page 1");
    await user.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Page 2");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(2);
    await user.keyboard(" ");
    // Space on the (now current) page does nothing more.
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("a button page never submits a surrounding form", async () => {
    const user = setupUser();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = renderUi(
      <form onSubmit={onSubmit}>
        <Pagination page={1} pageCount={3} onPageChange={() => {}} />
      </form>,
    );
    await user.click(container.querySelector("[aria-label='Page 2']") as HTMLElement);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("Pagination: styling and accessibility", () => {
  it("the current page is filled, the others are ghost buttons with a full-strength focus ring", () => {
    const { container } = renderUi(<Pagination page={2} pageCount={4} hrefFor={(p) => `?${p}`} />);
    expect(classes(current(container))).toEqual(
      expect.arrayContaining(["bg-primary", "text-primary-foreground"]),
    );
    const other = container.querySelector("[aria-label='Page 3']");
    expect(classes(other)).toEqual(
      expect.arrayContaining([
        "hover:bg-accent",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
      ]),
    );
    expect(classes(other)).not.toContain("bg-primary");
  });

  it("page controls are square and follow the density token", () => {
    const { container } = renderUi(<Pagination page={2} pageCount={4} hrefFor={(p) => `?${p}`} />);
    expect(classes(container.querySelector("[aria-label='Page 3']"))).toContain(
      "size-(--density-control-height)",
    );
  });

  it("passes axe as links and as buttons, including the disabled ends", async () => {
    const a = renderUi(<Pagination page={1} pageCount={20} hrefFor={(p) => `?${p}`} />);
    await expectNoA11yViolations(a.container);
    a.unmount();
    const b = renderUi(<Pagination page={10} pageCount={10} onPageChange={() => {}} />);
    await expectNoA11yViolations(b.container);
  });
});

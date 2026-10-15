import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { ScrollArea } from "./scroll-area.js";

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);
const viewport = (container: HTMLElement) =>
  container.querySelector("[role=region]") as HTMLElement;
// Base UI also puts data-orientation on each thumb, so keep only the scrollbars themselves.
const scrollbars = (container: HTMLElement) =>
  (Array.from(container.querySelectorAll("[data-orientation]")) as HTMLElement[]).filter(
    (el) => !el.parentElement?.hasAttribute("data-orientation"),
  );

describe("ScrollArea: structure", () => {
  it("renders the children inside a named, focusable scrollable region", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="Activity" className="h-24">
        <p>Item one</p>
        <p>Item two</p>
      </ScrollArea>,
    );
    const region = viewport(container);
    expect(region).not.toBeNull();
    expect(region.getAttribute("aria-label")).toBe("Activity");
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.textContent).toContain("Item one");
    expect(region.textContent).toContain("Item two");
  });

  it("supports aria-labelledby as the name", () => {
    const { container } = renderUi(
      <div>
        <h2 id="h">Logs</h2>
        <ScrollArea aria-labelledby="h">x</ScrollArea>
      </div>,
    );
    expect(viewport(container).getAttribute("aria-labelledby")).toBe("h");
  });

  it("requires a name at the type level", () => {
    // @ts-expect-error a scrollable region needs aria-label or aria-labelledby
    const element = <ScrollArea>x</ScrollArea>;
    expect(element).toBeTruthy();
  });

  it("applies className to the root and viewportClassName to the viewport", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" className="h-40 w-64" viewportClassName="p-2">
        x
      </ScrollArea>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(classes(root)).toEqual(
      expect.arrayContaining(["h-40", "w-64", "relative", "overflow-hidden"]),
    );
    expect(classes(viewport(container))).toContain("p-2");
  });

  it("lets className override the defaults", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" className="rounded-none">
        x
      </ScrollArea>,
    );
    const list = classes(container.firstElementChild as Element);
    expect(list).toContain("rounded-none");
    expect(list).not.toContain("rounded-md");
  });

  it("forwards ref to the root and viewportRef to the scrollable element", () => {
    const ref = createRef<HTMLDivElement>();
    const viewportRef = createRef<HTMLDivElement>();
    const { container } = renderUi(
      <ScrollArea aria-label="x" ref={ref} viewportRef={viewportRef}>
        x
      </ScrollArea>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(viewportRef.current).toBe(viewport(container));
  });

  it("passes other attributes to the root", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" data-testid="sa">
        x
      </ScrollArea>,
    );
    expect((container.firstElementChild as HTMLElement).getAttribute("data-testid")).toBe("sa");
  });
});

describe("ScrollArea: scrollbars", () => {
  it("has a vertical scrollbar by default (kept mounted so layout does not jump)", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" keepMounted>
        x
      </ScrollArea>,
    );
    const bars = scrollbars(container);
    expect(bars.map((b) => b.getAttribute("data-orientation"))).toEqual(["vertical"]);
  });

  it("horizontal renders only a horizontal scrollbar", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" orientation="horizontal" keepMounted>
        x
      </ScrollArea>,
    );
    expect(scrollbars(container).map((b) => b.getAttribute("data-orientation"))).toEqual([
      "horizontal",
    ]);
  });

  it("both renders two scrollbars", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" orientation="both" keepMounted>
        x
      </ScrollArea>,
    );
    expect(
      scrollbars(container)
        .map((b) => b.getAttribute("data-orientation"))
        .sort(),
    ).toEqual(["horizontal", "vertical"]);
  });

  it("does not mount scrollbars when there is nothing to scroll", () => {
    const { container } = renderUi(<ScrollArea aria-label="x">x</ScrollArea>);
    expect(scrollbars(container)).toHaveLength(0);
  });

  it("styles the thumb from tokens and the motion tokens for fading", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" keepMounted>
        x
      </ScrollArea>,
    );
    const bar = scrollbars(container)[0] as HTMLElement;
    expect(classes(bar)).toContain("duration-(--motion-duration-fast)");
    const thumb = bar.firstElementChild as HTMLElement;
    expect(classes(thumb)).toContain("bg-border");
  });

  it("defaults to showing scrollbars on hover and while scrolling", () => {
    const { container } = renderUi(
      <ScrollArea aria-label="x" keepMounted>
        x
      </ScrollArea>,
    );
    const list = classes(scrollbars(container)[0] as Element);
    expect(list).toContain("opacity-0");
    expect(list).toContain("data-[hovering]:opacity-100");
    expect(list).toContain("data-[scrolling]:opacity-100");
  });

  it("can keep scrollbars visible, or show them on hover and while scrolling", () => {
    const always = renderUi(
      <ScrollArea aria-label="x" keepMounted scrollbar="always">
        x
      </ScrollArea>,
    );
    expect(classes(scrollbars(always.container)[0] as Element)).not.toContain("opacity-0");
    const hover = renderUi(
      <ScrollArea aria-label="x" keepMounted scrollbar="hover">
        x
      </ScrollArea>,
    );
    expect(classes(scrollbars(hover.container)[0] as Element)).toContain("opacity-0");
  });
});

describe("ScrollArea: keyboard and accessibility", () => {
  it("is reachable with Tab and shows a full-strength focus ring", async () => {
    const user = setupUser();
    const { container } = renderUi(<ScrollArea aria-label="x">x</ScrollArea>);
    await user.tab();
    expect(document.activeElement).toBe(viewport(container));
    expect(classes(viewport(container))).toContain("focus-visible:ring-ring");
  });

  it("passes axe, with and without scrollbars", async () => {
    const plain = renderUi(
      <ScrollArea aria-label="Notes" className="h-24">
        <p>One</p>
      </ScrollArea>,
    );
    await expectNoA11yViolations(plain.container);
    const bars = renderUi(
      <ScrollArea aria-label="Wide table" orientation="both" keepMounted className="h-24">
        <p>One</p>
      </ScrollArea>,
    );
    await expectNoA11yViolations(bars.container);
  });
});

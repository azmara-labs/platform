import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const tabs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[role=tab]")) as HTMLElement[];
const selected = (container: HTMLElement) =>
  tabs(container).map((t) => t.getAttribute("aria-selected") === "true");
const panel = (container: HTMLElement) =>
  container.querySelector("[role=tabpanel]") as HTMLElement | null;

function Demo(props: {
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  disabledMiddle?: boolean;
  activateOnFocus?: boolean;
  keepMounted?: boolean;
}) {
  const { defaultValue = "one", disabledMiddle, activateOnFocus, keepMounted, orientation } = props;
  return (
    <Tabs defaultValue={defaultValue} orientation={orientation}>
      <TabsList aria-label="Sections" activateOnFocus={activateOnFocus}>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two" disabled={disabledMiddle}>
          Two
        </TabsTrigger>
        <TabsTrigger value="three">Three</TabsTrigger>
      </TabsList>
      <TabsContent value="one" keepMounted={keepMounted}>
        Panel one
      </TabsContent>
      <TabsContent value="two" keepMounted={keepMounted}>
        Panel two
      </TabsContent>
      <TabsContent value="three" keepMounted={keepMounted}>
        Panel three
      </TabsContent>
    </Tabs>
  );
}

describe("Tabs: semantics", () => {
  it("is a named tablist of tabs with one selected tab and its panel", () => {
    const { container } = renderUi(<Demo />);
    const list = container.querySelector("[role=tablist]") as HTMLElement;
    expect(list.getAttribute("aria-label")).toBe("Sections");
    expect(tabs(container)).toHaveLength(3);
    expect(selected(container)).toEqual([true, false, false]);
    expect(panel(container)?.textContent).toBe("Panel one");
  });

  it("wires each tab and its panel together", () => {
    const { container } = renderUi(<Demo />);
    const tab = tabs(container)[0] as HTMLElement;
    const p = panel(container) as HTMLElement;
    expect(tab.getAttribute("aria-controls")).toBe(p.id);
    expect(p.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("only the selected tab is in the tab order (roving tabindex)", () => {
    const { container } = renderUi(<Demo />);
    expect(tabs(container).map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("shows only the active panel unless keepMounted", () => {
    const { container } = renderUi(<Demo />);
    expect(container.textContent).not.toContain("Panel two");
    const kept = renderUi(<Demo keepMounted />);
    expect(kept.container.textContent).toContain("Panel two");
    expect(kept.container.textContent).toContain("Panel three");
  });
});

describe("Tabs: selecting", () => {
  it("selects with a click and shows that panel", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(tabs(container)[2] as HTMLElement);
    expect(selected(container)).toEqual([false, false, true]);
    expect(panel(container)?.textContent).toBe("Panel three");
  });

  it("can be controlled and reports changes", async () => {
    const user = setupUser();
    const seen: unknown[] = [];
    function Controlled() {
      const [value, setValue] = useState("one");
      return (
        <Tabs
          value={value}
          onValueChange={(next) => {
            seen.push(next);
            setValue(next as string);
          }}
        >
          <TabsList aria-label="x">
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">a</TabsContent>
          <TabsContent value="two">b</TabsContent>
        </Tabs>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(tabs(container)[1] as HTMLElement);
    expect(seen).toEqual(["two"]);
    expect(panel(container)?.textContent).toBe("b");
  });

  it("ignores a disabled tab", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo disabledMiddle />);
    await user.click(tabs(container)[1] as HTMLElement);
    expect(selected(container)).toEqual([true, false, false]);
  });
});

describe("Tabs: keyboard map (horizontal)", () => {
  it("Tab moves into the tablist at the selected tab, and on to the panel", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo defaultValue="two" />);
    await user.tab();
    expect(document.activeElement).toBe(tabs(container)[1]);
    await user.tab();
    expect(document.activeElement).toBe(panel(container));
  });

  it("ArrowRight and ArrowLeft move focus; Enter or Space activates (manual activation)", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs(container)[1]);
    expect(selected(container)).toEqual([true, false, false]); // focus only, not yet selected
    await user.keyboard("{Enter}");
    expect(selected(container)).toEqual([false, true, false]);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs(container)[0]);
    await user.keyboard(" ");
    expect(selected(container)).toEqual([true, false, false]);
  });

  it("with activateOnFocus, arrows select as they move", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo activateOnFocus />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(selected(container)).toEqual([false, true, false]);
    expect(panel(container)?.textContent).toBe("Panel two");
  });

  it("wraps around at the ends", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs(container)[2]);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs(container)[0]);
  });

  it("Home and End jump to the first and last tab", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tabs(container)[2]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs(container)[0]);
  });

  it("a disabled tab stays reachable by keyboard (discoverable) but cannot be selected", async () => {
    // Base UI keeps disabled tabs focusable with aria-disabled, which the ARIA tabs pattern allows.
    const user = setupUser();
    const { container } = renderUi(<Demo disabledMiddle />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs(container)[1]);
    expect(tabs(container)[1]?.getAttribute("aria-disabled")).toBe("true");
    await user.keyboard("{Enter}");
    expect(selected(container)).toEqual([true, false, false]);
  });
});

describe("Tabs: vertical", () => {
  it("is announced as vertical and navigates with ArrowDown and ArrowUp", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo orientation="vertical" />);
    const list = container.querySelector("[role=tablist]") as HTMLElement;
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tabs(container)[1]);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(tabs(container)[0]);
  });

  it("lays out as a row of list and panels", () => {
    const { container } = renderUi(<Demo orientation="vertical" />);
    expect(classes(container.firstElementChild)).toContain("flex");
    expect(classes(container.firstElementChild)).toContain("data-[orientation=vertical]:flex-row");
  });
});

describe("Tabs: styling", () => {
  it("marks the active tab from tokens and has a full-strength focus ring", () => {
    const { container } = renderUi(<Demo />);
    const tab = tabs(container)[0] as HTMLElement;
    expect(classes(tab)).toEqual(
      expect.arrayContaining([
        "focus-visible:ring-ring",
        "data-[active]:bg-background",
        "data-[active]:text-foreground",
      ]),
    );
  });

  it("the panel is focusable so keyboard users can reach scrolled content", () => {
    const { container } = renderUi(<Demo />);
    expect(panel(container)?.getAttribute("tabindex")).toBe("0");
  });
});

describe("Tabs: accessibility", () => {
  it("passes axe horizontal and vertical", async () => {
    const h = renderUi(<Demo />);
    await expectNoA11yViolations(h.container);
    const v = renderUi(<Demo orientation="vertical" />);
    await expectNoA11yViolations(v.container);
  });

  it("selection survives a re-render", async () => {
    const user = setupUser();
    const { container, rerender } = renderUi(<Demo />);
    await user.click(tabs(container)[1] as HTMLElement);
    rerender(<Demo />);
    await vi.waitFor(() => expect(selected(container)).toEqual([false, true, false]));
  });
});

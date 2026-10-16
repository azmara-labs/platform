import { Bold } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
  type ToggleProps,
} from "./toggle.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const buttons = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
const pressed = (container: HTMLElement) =>
  buttons(container).map((b) => b.getAttribute("aria-pressed") === "true");

describe("Toggle", () => {
  it("is a button with a pressed state, off by default", () => {
    const { container } = renderUi(<Toggle>Bold</Toggle>);
    const b = buttons(container)[0] as HTMLButtonElement;
    expect(b.getAttribute("aria-pressed")).toBe("false");
    expect(b.hasAttribute("data-pressed")).toBe(false);
  });

  it("toggles with a click, Enter and Space", async () => {
    const user = setupUser();
    const { container } = renderUi(<Toggle>Bold</Toggle>);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(pressed(container)).toEqual([true]);
    await user.keyboard("{Enter}");
    expect(pressed(container)).toEqual([false]);
    await user.keyboard(" ");
    expect(pressed(container)).toEqual([true]);
  });

  it("supports defaultPressed and reports changes", async () => {
    const user = setupUser();
    const onPressedChange = vi.fn();
    const { container } = renderUi(
      <Toggle defaultPressed onPressedChange={(v) => onPressedChange(v)}>
        Bold
      </Toggle>,
    );
    expect(pressed(container)).toEqual([true]);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(onPressedChange).toHaveBeenCalledWith(false);
  });

  it("can be controlled", async () => {
    const user = setupUser();
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <Toggle pressed={on} onPressedChange={setOn}>
          Bold
        </Toggle>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(pressed(container)).toEqual([true]);
  });

  it("does nothing when disabled", async () => {
    const user = setupUser();
    const { container } = renderUi(<Toggle disabled>Bold</Toggle>);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(pressed(container)).toEqual([false]);
  });

  it("shows the pressed state from tokens, with a full-strength focus ring", () => {
    const { container } = renderUi(<Toggle>Bold</Toggle>);
    expect(classes(buttons(container)[0] ?? null)).toEqual(
      expect.arrayContaining([
        "data-[pressed]:bg-accent",
        "data-[pressed]:text-accent-foreground",
        "focus-visible:ring-ring",
        "data-[disabled]:opacity-50",
      ]),
    );
  });

  it("has an outline variant", () => {
    const { container } = renderUi(<Toggle variant="outline">Bold</Toggle>);
    expect(classes(buttons(container)[0] ?? null)).toEqual(
      expect.arrayContaining(["border", "border-input"]),
    );
  });

  it.each([
    ["sm", "h-8"],
    ["lg", "h-11"],
  ] as const)("size %s is %s", (size, cls) => {
    const { container } = renderUi(<Toggle size={size}>Bold</Toggle>);
    expect(classes(buttons(container)[0] ?? null)).toContain(cls);
  });

  it("an icon toggle must be named (the types enforce it)", () => {
    // @ts-expect-error an icon-only toggle needs an accessible name
    const bad: ToggleProps = { size: "icon" };
    expect(bad).toBeTruthy();
    const { container } = renderUi(
      <Toggle size="icon" aria-label="Bold">
        <Bold />
      </Toggle>,
    );
    expect(buttons(container)[0]?.getAttribute("aria-label")).toBe("Bold");
  });

  it("passes axe, off and on", async () => {
    const { container } = renderUi(
      <div>
        <Toggle>Off</Toggle>
        <Toggle defaultPressed>On</Toggle>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});

function Align(props: {
  multiple?: boolean;
  orientation?: "horizontal" | "vertical";
  disabledMiddle?: boolean;
  onValueChange?: (v: unknown) => void;
  defaultValue?: string[];
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label="Alignment"
      multiple={props.multiple}
      orientation={props.orientation}
      defaultValue={props.defaultValue}
      disabled={props.disabled}
      onValueChange={props.onValueChange}
    >
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="centre" disabled={props.disabledMiddle}>
        Centre
      </ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  );
}

describe("ToggleGroup: selection", () => {
  it("is a named group of toggles", () => {
    const { container } = renderUi(<Align />);
    const g = container.querySelector("[role=group]") as HTMLElement;
    expect(g.getAttribute("aria-label")).toBe("Alignment");
    expect(buttons(container)).toHaveLength(3);
  });

  it("requires a name (the types enforce it)", () => {
    // @ts-expect-error a toggle group needs an accessible name
    const bad: ToggleGroupProps = {};
    expect(bad).toBeTruthy();
  });

  it("single selection: pressing one releases the others", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align defaultValue={["left"]} />);
    expect(pressed(container)).toEqual([true, false, false]);
    await user.click(buttons(container)[2] as HTMLElement);
    expect(pressed(container)).toEqual([false, false, true]);
  });

  it("single selection: pressing the pressed one releases it (nothing selected is allowed)", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align defaultValue={["left"]} />);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(pressed(container)).toEqual([false, false, false]);
  });

  it("multiple selection: each toggles on its own", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align multiple />);
    await user.click(buttons(container)[0] as HTMLElement);
    await user.click(buttons(container)[2] as HTMLElement);
    expect(pressed(container)).toEqual([true, false, true]);
  });

  it("reports the pressed values as an array", async () => {
    const user = setupUser();
    const seen: unknown[] = [];
    const { container } = renderUi(<Align multiple onValueChange={(v) => seen.push(v)} />);
    await user.click(buttons(container)[0] as HTMLElement);
    await user.click(buttons(container)[1] as HTMLElement);
    expect(seen).toEqual([["left"], ["left", "centre"]]);
  });

  it("ignores a disabled item, and a disabled group disables all", async () => {
    const user = setupUser();
    const a = renderUi(<Align disabledMiddle />);
    await user.click(buttons(a.container)[1] as HTMLElement);
    expect(pressed(a.container)).toEqual([false, false, false]);
    a.unmount();
    const b = renderUi(<Align disabled />);
    await user.click(buttons(b.container)[0] as HTMLElement);
    expect(pressed(b.container)).toEqual([false, false, false]);
  });

  it("can be controlled", async () => {
    const user = setupUser();
    function Controlled() {
      const [value, setValue] = useState<string[]>(["right"]);
      return (
        <ToggleGroup aria-label="x" value={value} onValueChange={(v) => setValue(v as string[])}>
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
      );
    }
    const { container } = renderUi(<Controlled />);
    expect(pressed(container)).toEqual([false, true]);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(pressed(container)).toEqual([true, false]);
  });
});

describe("ToggleGroup: keyboard map", () => {
  it("Tab enters the group once (a single tab stop), then on to the page", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Align />
        <button type="button">After</button>
      </div>,
    );
    const items = buttons(container);
    await user.tab();
    expect(document.activeElement).toBe(items[0]);
    // Only the current item is in the tab order (roving tabindex); the other two are reached by arrows.
    expect(items.slice(0, 3).map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    await user.tab();
    expect(document.activeElement).toBe(items[3]);
  });

  it("ArrowRight and ArrowLeft move focus and wrap, without changing the selection", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align defaultValue={["left"]} />);
    const items = buttons(container);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(items[1]);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(items[2]);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(items[2]);
    expect(pressed(container)).toEqual([true, false, false]);
  });

  it("Home and End jump to the first and last item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align />);
    const items = buttons(container);
    await user.tab();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(items[2]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(items[0]);
  });

  it("Space and Enter press the focused item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(pressed(container)).toEqual([false, true, false]);
    await user.keyboard("{ArrowRight}{Enter}");
    expect(pressed(container)).toEqual([false, false, true]);
  });

  it("vertical groups use ArrowDown and ArrowUp", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align orientation="vertical" />);
    const items = buttons(container);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(items[1]);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(items[0]);
  });

  it("arrow keys skip a disabled item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Align disabledMiddle />);
    const items = buttons(container);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[2]));
    await user.keyboard("{ArrowLeft}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[0]));
  });
});

describe("ToggleGroup: styling", () => {
  it("joins its items like a button group and raises the focused one", () => {
    const { container } = renderUi(<Align />);
    const g = container.querySelector("[role=group]") as HTMLElement;
    expect(classes(g)).toEqual(
      expect.arrayContaining([
        "inline-flex",
        "[&>*:not(:first-child)]:rounded-l-none",
        "[&>*:not(:last-child)]:rounded-r-none",
        "[&>*:not(:first-child)]:-ml-px",
        "[&>*:focus-visible]:z-10",
      ]),
    );
  });

  it("items take the group's variant and size", () => {
    const { container } = renderUi(
      <ToggleGroup aria-label="x" variant="outline" size="sm">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(classes(buttons(container)[0] ?? null)).toEqual(
      expect.arrayContaining(["border-input", "h-8"]),
    );
  });

  it("an item can override the group's variant", () => {
    const { container } = renderUi(
      <ToggleGroup aria-label="x" variant="outline">
        <ToggleGroupItem value="a" variant="default">
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(classes(buttons(container)[0] ?? null)).not.toContain("border-input");
  });

  it("passes axe", async () => {
    const { container } = renderUi(<Align defaultValue={["centre"]} />);
    await expectNoA11yViolations(container);
  });
});

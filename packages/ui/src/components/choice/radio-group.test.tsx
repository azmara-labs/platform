import { within } from "@testing-library/dom";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Radio, RadioGroup, type RadioGroupProps, type RadioProps } from "./radio-group.js";
import type { ChoiceOption } from "./types.js";

const PLANS: ChoiceOption[] = [
  { value: "free", label: "Free", description: "For trying it out." },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
];

const radios = (container: HTMLElement) => within(container).queryAllByRole("radio");
const checked = (container: HTMLElement) =>
  radios(container).map((r) => r.getAttribute("aria-checked") === "true");
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("RadioGroup: structure", () => {
  it("is a radiogroup named by its legend", () => {
    const { container } = renderUi(<RadioGroup label="Plan" options={PLANS} />);
    const group = within(container).getByRole("radiogroup", { name: "Plan" });
    expect(radios(group)).toHaveLength(3);
  });

  it("is named by aria-label when there is no legend", () => {
    const { container } = renderUi(<RadioGroup aria-label="Plan" options={PLANS} />);
    expect(within(container).getByRole("radiogroup", { name: "Plan" })).toBeTruthy();
  });

  it("each radio is named by its label and described by its description", () => {
    const { container } = renderUi(<RadioGroup label="Plan" options={PLANS} />);
    expect(within(container).getByRole("radio", { name: "Free" })).toBeTruthy();
    const free = within(container).getByRole("radio", { name: "Free" });
    const ids = (free.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    expect(ids.map((id) => document.getElementById(id)?.textContent).join(" ")).toContain(
      "For trying it out.",
    );
  });

  it("options render the same radios as hand-written children", () => {
    const a = renderUi(<RadioGroup label="Plan" options={PLANS} defaultValue="pro" />);
    const b = renderUi(
      <RadioGroup label="Plan" defaultValue="pro">
        <Radio value="free" label="Free" description="For trying it out." />
        <Radio value="pro" label="Pro" />
        <Radio value="team" label="Team" />
      </RadioGroup>,
    );
    const shape = (c: HTMLElement) =>
      radios(c).map((r) => [
        r.getAttribute("aria-checked"),
        r.closest("label")?.textContent,
        r.getAttribute("role"),
      ]);
    expect(shape(b.container)).toEqual(shape(a.container));
    expect(a.container.textContent).toBe(b.container.textContent);
  });

  it("options={[]} renders the legend and no radios", () => {
    const { container } = renderUi(<RadioGroup label="Plan" options={[]} />);
    expect(container.textContent).toContain("Plan");
    expect(radios(container)).toHaveLength(0);
  });

  it("options and children are mutually exclusive (the types enforce it)", () => {
    // @ts-expect-error options and children cannot be given together
    const both: RadioGroupProps = { label: "x", options: PLANS, children: null };
    // @ts-expect-error a group needs a name
    const unnamed: RadioGroupProps = { options: PLANS };
    expect([both, unnamed]).toBeTruthy();
  });

  it("a radio needs a name (the types enforce it)", () => {
    // @ts-expect-error a radio needs a label, aria-label or aria-labelledby
    const bad: RadioProps = { value: "x" };
    expect(bad).toBeTruthy();
  });
});

describe("RadioGroup: selection", () => {
  it("selecting reports the value string", async () => {
    const user = setupUser();
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <RadioGroup label="Plan" options={PLANS} onValueChange={onValueChange} />,
    );
    await user.click(within(container).getByText("Pro"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toBe("pro");
    expect(checked(container)).toEqual([false, true, false]);
  });

  it("can be controlled", async () => {
    const user = setupUser();
    function Controlled() {
      const [value, setValue] = useState("team");
      return <RadioGroup label="Plan" options={PLANS} value={value} onValueChange={setValue} />;
    }
    const { container } = renderUi(<Controlled />);
    expect(checked(container)).toEqual([false, false, true]);
    await user.click(within(container).getByText("Free"));
    expect(checked(container)).toEqual([true, false, false]);
  });

  it("posts the chosen value under the group's name", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <RadioGroup label="Plan" name="plan" options={PLANS} />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).has("plan")).toBe(false);
    await user.click(within(container).getByText("Pro"));
    expect(new FormData(form).getAll("plan")).toEqual(["pro"]);
  });

  it("a disabled option cannot be chosen and a disabled group disables all", async () => {
    const user = setupUser();
    const a = renderUi(
      <RadioGroup
        label="Plan"
        options={[PLANS[0] as ChoiceOption, { value: "x", label: "X", disabled: true }]}
      />,
    );
    await user.click(within(a.container).getByText("X"));
    expect(checked(a.container)).toEqual([false, false]);
    a.unmount();
    const b = renderUi(<RadioGroup label="Plan" options={PLANS} disabled />);
    await user.click(within(b.container).getByText("Free"));
    expect(checked(b.container)).toEqual([false, false, false]);
  });

  it("readOnly does not change the selection", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <RadioGroup label="Plan" options={PLANS} defaultValue="free" readOnly />,
    );
    await user.click(within(container).getByText("Pro"));
    expect(checked(container)).toEqual([true, false, false]);
  });
});

describe("RadioGroup: keyboard", () => {
  it("Tab enters the group once, arrows move focus and select, and they wrap", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <RadioGroup label="Plan" options={PLANS} />
        <button type="button">After</button>
      </div>,
    );
    const items = radios(container);
    await user.tab();
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[1]));
    expect(checked(container)).toEqual([false, true, false]);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[0]));
    expect(checked(container)).toEqual([true, false, false]);
    await user.keyboard("{ArrowUp}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[2]));
    await user.tab();
    expect(document.activeElement).toBe(within(container).getByText("After"));
  });

  it.each(["horizontal", "vertical"] as const)(
    "%s groups move with every arrow key, as the WAI-ARIA radio pattern asks",
    async (orientation) => {
      const user = setupUser();
      const { container } = renderUi(
        <RadioGroup label="Plan" options={PLANS} orientation={orientation} defaultValue="free" />,
      );
      const items = radios(container);
      await user.tab();
      expect(document.activeElement).toBe(items[0]);
      await user.keyboard("{ArrowRight}");
      await vi.waitFor(() => expect(document.activeElement).toBe(items[1]));
      await user.keyboard("{ArrowLeft}");
      await vi.waitFor(() => expect(document.activeElement).toBe(items[0]));
    },
  );

  it("arrow keys skip a disabled option", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <RadioGroup
        label="Plan"
        defaultValue="free"
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro", disabled: true },
          { value: "team", label: "Team" },
        ]}
      />,
    );
    const items = radios(container);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(document.activeElement).toBe(items[2]));
  });

  it("Space selects the focused radio", async () => {
    const user = setupUser();
    const { container } = renderUi(<RadioGroup label="Plan" options={PLANS} />);
    await user.tab();
    await user.keyboard(" ");
    expect(checked(container)).toEqual([true, false, false]);
  });
});

describe("RadioGroup: state, size and layout", () => {
  it("an error marks the group invalid and shows the message; required sets aria-required", () => {
    const { container } = renderUi(
      <RadioGroup label="Plan" options={PLANS} error="Pick a plan." required />,
    );
    const group = within(container).getByRole("radiogroup");
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-required")).toBe("true");
    expect(container.textContent).toContain("Pick a plan.");
    const ids = (group.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent).join(" ")).toContain(
      "Pick a plan.",
    );
  });

  it("a description is the group's accessible description", () => {
    const { container } = renderUi(
      <RadioGroup label="Plan" description="You can change it later." options={PLANS} />,
    );
    const group = within(container).getByRole("radiogroup");
    const ids = (group.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent).join(" ")).toContain(
      "You can change it later.",
    );
  });

  it("group size reaches the items, and an item can override it", () => {
    const { container } = renderUi(
      <RadioGroup label="Plan" size="lg">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" size="sm" />
      </RadioGroup>,
    );
    const rows = Array.from(container.querySelectorAll("label"));
    expect(classes(rows[0] ?? null)).toContain("min-h-11");
    expect(classes(rows[1] ?? null)).toContain("min-h-8");
  });

  it("orientation sets the layout", () => {
    const h = renderUi(<RadioGroup label="Plan" options={PLANS} orientation="horizontal" />);
    expect(h.container.innerHTML).toContain("flex-row");
    h.unmount();
    const v = renderUi(<RadioGroup label="Plan" options={PLANS} />);
    expect(v.container.innerHTML).toContain("flex-col");
  });

  it("passes className through last, on the outermost element", () => {
    const { container } = renderUi(<RadioGroup label="Plan" options={PLANS} className="mine" />);
    expect(classes(container.firstElementChild).at(-1)).toBe("mine");
  });
});

describe("RadioGroup: isolation and hygiene", () => {
  it("two groups with the same option values do not cross-wire", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <RadioGroup label="First" options={PLANS} />
        <RadioGroup label="Second" options={PLANS} />
      </div>,
    );
    const first = within(container).getByRole("radiogroup", { name: "First" });
    const second = within(container).getByRole("radiogroup", { name: "Second" });
    await user.click(within(first).getByText("Pro"));
    expect(checked(first)).toEqual([false, true, false]);
    expect(checked(second)).toEqual([false, false, false]);
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("duplicate option values warn once in development and every option still renders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = renderUi(
      <RadioGroup
        label="Plan"
        options={[
          { value: "a", label: "A1" },
          { value: "a", label: "A2" },
        ]}
      />,
    );
    expect(radios(container)).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("reads only the four option fields; nothing else reaches the DOM", () => {
    const hostile = {
      value: "a",
      label: "A",
      onClick: "alert(1)",
      href: "javascript:alert(1)",
      dangerouslySetInnerHTML: { __html: "<img src=x onerror=alert(1)>" },
      "data-evil": "1",
    } as unknown as ChoiceOption;
    const { container } = renderUi(<RadioGroup label="Plan" options={[hostile]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    expect(container.innerHTML).not.toContain("data-evil");
    expect(container.innerHTML).not.toContain("onclick");
  });

  it("passes axe in light and dark", async () => {
    const tree = (
      <div>
        <RadioGroup label="Plan" description="Pick one." options={PLANS} defaultValue="pro" />
        <RadioGroup
          label="Size"
          orientation="horizontal"
          options={PLANS}
          error="Required."
          required
        />
      </div>
    );
    const light = renderUi(tree);
    await expectNoA11yViolations(light.container);
    light.unmount();
    const dark = renderUi(<div className="dark">{tree}</div>);
    await expectNoA11yViolations(dark.container);
  });
});

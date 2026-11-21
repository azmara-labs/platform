import { within } from "@testing-library/dom";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Checkbox } from "./checkbox.js";
import { CheckboxGroup, type CheckboxGroupProps } from "./checkbox-group.js";
import type { ChoiceOption } from "./types.js";

const TAGS: ChoiceOption[] = [
  { value: "a", label: "Alpha", description: "The first." },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

const boxes = (container: HTMLElement) => within(container).queryAllByRole("checkbox");
const state = (container: HTMLElement) =>
  boxes(container).map((b) => b.getAttribute("aria-checked"));
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const describedText = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)
    .join(" ");

describe("CheckboxGroup: structure", () => {
  it("is a group named by its legend", () => {
    const { container } = renderUi(<CheckboxGroup label="Tags" options={TAGS} />);
    const group = within(container).getByRole("group", { name: "Tags" });
    expect(boxes(group)).toHaveLength(3);
  });

  it("each checkbox is named by its label and described by its description", () => {
    const { container } = renderUi(<CheckboxGroup label="Tags" options={TAGS} />);
    expect(describedText(within(container).getByRole("checkbox", { name: "Alpha" }))).toContain(
      "The first.",
    );
  });

  it("options match hand-written Checkbox children", () => {
    const a = renderUi(<CheckboxGroup label="Tags" options={TAGS} defaultValue={["b"]} />);
    const b = renderUi(
      <CheckboxGroup label="Tags" defaultValue={["b"]}>
        <Checkbox value="a" label="Alpha" description="The first." />
        <Checkbox value="b" label="Beta" />
        <Checkbox value="c" label="Gamma" />
      </CheckboxGroup>,
    );
    expect(state(b.container)).toEqual(state(a.container));
    expect(b.container.textContent).toBe(a.container.textContent);
  });

  it("options={[]} renders the legend, no checkboxes and no tab stop", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <CheckboxGroup label="Tags" options={[]} />
        <button type="button">After</button>
      </div>,
    );
    expect(container.textContent).toContain("Tags");
    expect(boxes(container)).toHaveLength(0);
    await user.tab();
    expect(document.activeElement).toBe(within(container).getByText("After"));
  });

  it("options and children are mutually exclusive, and a group needs a name (the types enforce it)", () => {
    // @ts-expect-error options and children cannot be given together
    const both: CheckboxGroupProps = { label: "x", options: TAGS, children: null };
    // @ts-expect-error a group needs a name
    const unnamed: CheckboxGroupProps = { options: TAGS };
    expect([both, unnamed]).toBeTruthy();
  });
});

describe("CheckboxGroup: selection", () => {
  it("toggling reports a string array", async () => {
    const user = setupUser();
    const seen: string[][] = [];
    const { container } = renderUi(
      <CheckboxGroup label="Tags" options={TAGS} onValueChange={(v) => seen.push(v)} />,
    );
    await user.click(within(container).getByText("Alpha"));
    await user.click(within(container).getByText("Gamma"));
    await user.click(within(container).getByText("Alpha"));
    expect(seen).toEqual([["a"], ["a", "c"], ["c"]]);
  });

  it("can be controlled", async () => {
    const user = setupUser();
    function Controlled() {
      const [value, setValue] = useState<string[]>(["c"]);
      return <CheckboxGroup label="Tags" options={TAGS} value={value} onValueChange={setValue} />;
    }
    const { container } = renderUi(<Controlled />);
    expect(state(container)).toEqual(["false", "false", "true"]);
    await user.click(within(container).getByText("Alpha"));
    expect(state(container)).toEqual(["true", "false", "true"]);
  });

  it("Tab visits each checkbox and Space toggles", async () => {
    const user = setupUser();
    const { container } = renderUi(<CheckboxGroup label="Tags" options={TAGS} />);
    const items = boxes(container);
    await user.tab();
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard(" ");
    await user.tab();
    expect(document.activeElement).toBe(items[1]);
    expect(state(container)).toEqual(["true", "false", "false"]);
  });

  it("a disabled option and a disabled group ignore clicks", async () => {
    const user = setupUser();
    const a = renderUi(
      <CheckboxGroup label="Tags" options={[{ value: "a", label: "A", disabled: true }]} />,
    );
    await user.click(within(a.container).getByText("A"));
    expect(state(a.container)).toEqual(["false"]);
    a.unmount();
    const b = renderUi(<CheckboxGroup label="Tags" options={TAGS} disabled />);
    await user.click(within(b.container).getByText("Alpha"));
    expect(state(b.container)).toEqual(["false", "false", "false"]);
  });

  it("posts every ticked value under the group's name, and nothing when none are ticked", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <CheckboxGroup label="Tags" name="tags" options={TAGS} />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).has("tags")).toBe(false);
    await user.click(within(container).getByText("Alpha"));
    await user.click(within(container).getByText("Gamma"));
    expect(new FormData(form).getAll("tags")).toEqual(["a", "c"]);
  });

  it("an unknown value in value is kept when another option is toggled", async () => {
    const user = setupUser();
    const seen: string[][] = [];
    const { container } = renderUi(
      <CheckboxGroup
        label="Tags"
        options={TAGS}
        defaultValue={["a", "zzz"]}
        onValueChange={(v) => seen.push(v)}
      />,
    );
    expect(state(container)).toEqual(["true", "false", "false"]);
    await user.click(within(container).getByText("Beta"));
    expect([...(seen[0] ?? [])].sort()).toEqual(["a", "b", "zzz"]);
  });
});

describe("CheckboxGroup: select all", () => {
  it("selectAllLabel adds a Select all that checks all, is mixed for some, and unchecks all", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <CheckboxGroup label="Tags" options={TAGS} selectAllLabel="Select all" />,
    );
    const all = () => within(container).getByRole("checkbox", { name: "Select all" });
    expect(boxes(container)).toHaveLength(4);
    expect(all().getAttribute("aria-checked")).toBe("false");
    await user.click(within(container).getByText("Alpha"));
    expect(all().getAttribute("aria-checked")).toBe("mixed");
    await user.click(all());
    expect(state(container)).toEqual(["true", "true", "true", "true"]);
    await user.click(all());
    expect(state(container)).toEqual(["false", "false", "false", "false"]);
  });

  it("a hand-written parent checkbox with allValues behaves the same", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <CheckboxGroup label="Tags" allValues={["a", "b"]}>
        <Checkbox parent label="Everything" />
        <Checkbox value="a" label="Alpha" />
        <Checkbox value="b" label="Beta" />
      </CheckboxGroup>,
    );
    await user.click(within(container).getByRole("checkbox", { name: "Everything" }));
    expect(state(container)).toEqual(["true", "true", "true"]);
  });

  it("select all leaves a disabled option unchanged, ticked or not", async () => {
    const user = setupUser();
    const options: ChoiceOption[] = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta", disabled: true },
      { value: "c", label: "Gamma", disabled: true },
    ];
    const seen: string[][] = [];
    const { container } = renderUi(
      <CheckboxGroup
        label="Tags"
        options={options}
        selectAllLabel="Select all"
        defaultValue={["c"]}
        onValueChange={(v) => seen.push(v)}
      />,
    );
    const all = () => within(container).getByRole("checkbox", { name: "Select all" });
    await user.click(all());
    expect([...(seen.at(-1) ?? [])].sort()).toEqual(["a", "c"]);
    await user.click(all());
    expect([...(seen.at(-1) ?? [])].sort()).toEqual(["c"]);
  });

  it("select all shows a ticked disabled option as ticked and the parent as mixed", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <CheckboxGroup
        label="Tags"
        selectAllLabel="Select all"
        defaultValue={["c"]}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", disabled: true },
          { value: "c", label: "Gamma", disabled: true },
        ]}
      />,
    );
    const box = (n: string) => within(container).getByRole("checkbox", { name: n });
    const states = () => ["Alpha", "Beta", "Gamma"].map((n) => box(n).getAttribute("aria-checked"));
    expect(box("Gamma").getAttribute("aria-checked")).toBe("true");
    expect(box("Select all").getAttribute("aria-checked")).toBe("mixed");
    await user.click(box("Select all"));
    expect(states()).toEqual(["true", "false", "true"]);
    await user.click(box("Select all"));
    expect(states()).toEqual(["false", "false", "true"]);
  });

  it("a hand-written parent with every value in allValues keeps a ticked disabled one ticked", () => {
    const { container } = renderUi(
      <CheckboxGroup label="Tags" allValues={["a", "c"]} defaultValue={["c"]}>
        <Checkbox parent label="Everything" />
        <Checkbox value="a" label="Alpha" />
        <Checkbox value="c" label="Gamma" disabled />
      </CheckboxGroup>,
    );
    expect(
      within(container).getByRole("checkbox", { name: "Gamma" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("the select all checkbox never posts a value under the group's name", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <CheckboxGroup label="Tags" name="tags" options={TAGS} selectAllLabel="Select all" />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    await user.click(within(container).getByRole("checkbox", { name: "Select all" }));
    expect(new FormData(form).getAll("tags")).toEqual(["a", "b", "c"]);
  });
});

describe("CheckboxGroup: state, size and hygiene", () => {
  it("an error is the group's accessible description and shows its message", () => {
    const { container } = renderUi(
      <CheckboxGroup label="Tags" options={TAGS} error="Pick at least one." />,
    );
    const group = within(container).getByRole("group");
    expect(describedText(group)).toContain("Pick at least one.");
    expect(container.textContent).toContain("Pick at least one.");
    // aria-invalid is not allowed on role=group, so the group does not carry it.
    expect(group.hasAttribute("aria-invalid")).toBe(false);
  });

  it("required shows the marker on the legend", () => {
    const { container } = renderUi(<CheckboxGroup label="Tags" options={TAGS} required />);
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    expect(hidden.map((el) => el.textContent)).toContain("*");
  });

  it("group size reaches the items, and an item can override it", () => {
    const { container } = renderUi(
      <CheckboxGroup label="Tags" size="lg">
        <Checkbox value="a" label="A" />
        <Checkbox value="b" label="B" size="sm" />
      </CheckboxGroup>,
    );
    const rows = Array.from(container.querySelectorAll("label"));
    expect(classes(rows[0] ?? null)).toContain("min-h-11");
    expect(classes(rows[1] ?? null)).toContain("min-h-8");
  });

  it("orientation sets the layout, and className goes last on the outermost element", () => {
    const { container } = renderUi(
      <CheckboxGroup label="Tags" options={TAGS} orientation="horizontal" className="mine" />,
    );
    expect(container.innerHTML).toContain("flex-row");
    expect(classes(container.firstElementChild).at(-1)).toBe("mine");
  });

  it("duplicate option values warn once and every option still renders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = renderUi(
      <CheckboxGroup
        label="Tags"
        options={[
          { value: "a", label: "A1" },
          { value: "a", label: "A2" },
        ]}
      />,
    );
    expect(boxes(container)).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("two groups that share option values do not cross-wire", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <CheckboxGroup label="First" options={TAGS} />
        <CheckboxGroup label="Second" options={TAGS} />
      </div>,
    );
    const first = within(container).getByRole("group", { name: "First" });
    const second = within(container).getByRole("group", { name: "Second" });
    await user.click(within(first).getByText("Beta"));
    expect(state(first)).toEqual(["false", "true", "false"]);
    expect(state(second)).toEqual(["false", "false", "false"]);
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
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
    const { container } = renderUi(<CheckboxGroup label="Tags" options={[hostile]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    expect(container.innerHTML).not.toContain("data-evil");
    expect(container.innerHTML).not.toContain("onclick");
  });

  it("passes axe in light and dark", async () => {
    const tree = (
      <div>
        <CheckboxGroup
          label="Tags"
          description="Pick any."
          options={TAGS}
          selectAllLabel="Select all"
          defaultValue={["a"]}
        />
        <CheckboxGroup label="Other" options={TAGS} error="Required." required />
      </div>
    );
    const light = renderUi(tree);
    await expectNoA11yViolations(light.container);
    light.unmount();
    const dark = renderUi(<div className="dark">{tree}</div>);
    await expectNoA11yViolations(dark.container);
  });
});

import { within } from "@testing-library/dom";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Checkbox, type CheckboxProps } from "./checkbox.js";

const box = (container: HTMLElement, name?: string) =>
  within(container).getByRole("checkbox", name ? { name } : {});
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Checkbox", () => {
  it("is a checkbox named by its label", () => {
    const { container } = renderUi(<Checkbox label="Customer has signed" />);
    expect(box(container, "Customer has signed").getAttribute("aria-checked")).toBe("false");
  });

  it("clicking the label toggles it", async () => {
    const user = setupUser();
    const { container } = renderUi(<Checkbox label="Customer has signed" />);
    await user.click(within(container).getByText("Customer has signed"));
    expect(box(container).getAttribute("aria-checked")).toBe("true");
  });

  it("Space toggles it and Tab reaches it once", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Checkbox label="Terms" />
        <button type="button">After</button>
      </div>,
    );
    await user.tab();
    expect(document.activeElement).toBe(box(container));
    await user.keyboard(" ");
    expect(box(container).getAttribute("aria-checked")).toBe("true");
    await user.tab();
    expect(document.activeElement).toBe(within(container).getByText("After"));
  });

  it("reports boolean changes, controlled and uncontrolled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    const a = renderUi(<Checkbox label="A" onCheckedChange={(v) => seen.push(v)} />);
    await user.click(box(a.container));
    await user.click(box(a.container));
    expect(seen).toEqual([true, false]);
    a.unmount();

    function Controlled() {
      const [on, setOn] = useState(false);
      return <Checkbox label="B" checked={on} onCheckedChange={setOn} />;
    }
    const b = renderUi(<Controlled />);
    await user.click(box(b.container));
    expect(box(b.container).getAttribute("aria-checked")).toBe("true");
  });

  it("indeterminate shows data-indeterminate and aria-checked=mixed, and a click makes it checked", async () => {
    const user = setupUser();
    function Mixed() {
      const [on, setOn] = useState(false);
      return <Checkbox label="All" checked={on} indeterminate={!on} onCheckedChange={setOn} />;
    }
    const { container } = renderUi(<Mixed />);
    const el = box(container);
    expect(el.hasAttribute("data-indeterminate")).toBe(true);
    expect(el.getAttribute("aria-checked")).toBe("mixed");
    await user.click(el);
    expect(box(container).getAttribute("aria-checked")).toBe("true");
    expect(box(container).hasAttribute("data-indeterminate")).toBe(false);
  });

  it("description is the accessible description", () => {
    const { container } = renderUi(<Checkbox label="Terms" description="Read the small print." />);
    const el = box(container);
    const ids = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    const text = ids.map((id) => document.getElementById(id)?.textContent).join(" ");
    expect(text).toContain("Read the small print.");
  });

  it("error marks it invalid and shows the message", () => {
    const { container } = renderUi(<Checkbox label="Terms" error="You must accept." />);
    expect(box(container).getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("You must accept.");
  });

  it("no error means not invalid", () => {
    const { container } = renderUi(<Checkbox label="Terms" />);
    expect(box(container).hasAttribute("aria-invalid")).toBe(false);
  });

  it("required sets aria-required and shows the marker", () => {
    const { container } = renderUi(<Checkbox label="Terms" required />);
    expect(box(container).getAttribute("aria-required")).toBe("true");
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    expect(hidden.map((el) => el.textContent)).toContain("*");
  });

  it("disabled does not change", async () => {
    const user = setupUser();
    const { container } = renderUi(<Checkbox label="Terms" disabled />);
    await user.click(box(container));
    expect(box(container).getAttribute("aria-checked")).toBe("false");
  });

  it("readOnly does not change", async () => {
    const user = setupUser();
    const onCheckedChange = vi.fn();
    const { container } = renderUi(
      <Checkbox label="Terms" readOnly onCheckedChange={onCheckedChange} />,
    );
    await user.click(box(container));
    expect(box(container).getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("posts its name only when checked", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <Checkbox label="Terms" name="terms" />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).has("terms")).toBe(false);
    await user.click(box(container));
    expect(new FormData(form).get("terms")).toBe("on");
  });

  it.each([
    ["sm", "min-h-8"],
    ["md", "min-h-(--density-control-height)"],
    ["lg", "min-h-11"],
  ] as const)("size %s sets the row to %s", (size, cls) => {
    const { container } = renderUi(<Checkbox label="Terms" size={size} />);
    const row = container.querySelector("label") as HTMLElement;
    expect(classes(row)).toContain(cls);
  });

  it("passes className through last, on the outermost element", () => {
    const { container } = renderUi(<Checkbox label="Terms" className="custom-row" />);
    expect(classes(container.firstElementChild).at(-1)).toBe("custom-row");
  });

  it("needs a name (the types enforce it)", () => {
    // @ts-expect-error a checkbox needs a label, aria-label or aria-labelledby
    const bad: CheckboxProps = {};
    expect(bad).toBeTruthy();
    const { container } = renderUi(<Checkbox aria-label="Terms" />);
    expect(box(container, "Terms")).toBeTruthy();
  });

  it("has no uncheckedValue: an unticked box posts nothing, never the string 'false'", () => {
    // @ts-expect-error uncheckedValue is not supported, so a post can never carry "false"
    const bad: CheckboxProps = { label: "x", uncheckedValue: "false" };
    expect(bad).toBeTruthy();
  });

  it("renders a label with markup as text, never as HTML", () => {
    const { container } = renderUi(<Checkbox label={'"><img src=x onerror=alert(1)>'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain('"><img src=x onerror=alert(1)>');
  });

  it("passes axe in light and dark", async () => {
    const tree = (
      <div>
        <Checkbox label="Off" />
        <Checkbox label="On" defaultChecked description="Described." />
        <Checkbox label="Mixed" indeterminate />
        <Checkbox label="Bad" error="Required." required />
      </div>
    );
    const light = renderUi(tree);
    await expectNoA11yViolations(light.container);
    light.unmount();
    const dark = renderUi(<div className="dark">{tree}</div>);
    await expectNoA11yViolations(dark.container);
  });
});

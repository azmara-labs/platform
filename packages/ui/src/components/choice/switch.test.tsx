import { within } from "@testing-library/dom";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Switch, type SwitchProps } from "./switch.js";

const sw = (container: HTMLElement, name?: string) =>
  within(container).getByRole("switch", name ? { name } : {});
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Switch", () => {
  it("is a switch named by its label", () => {
    const { container } = renderUi(<Switch label="Email me" />);
    expect(sw(container, "Email me").getAttribute("aria-checked")).toBe("false");
  });

  it("Space toggles it, and a click and a label click do too", async () => {
    const user = setupUser();
    const { container } = renderUi(<Switch label="Email me" />);
    await user.tab();
    expect(document.activeElement).toBe(sw(container));
    await user.keyboard(" ");
    expect(sw(container).getAttribute("aria-checked")).toBe("true");
    await user.click(sw(container));
    expect(sw(container).getAttribute("aria-checked")).toBe("false");
    await user.click(within(container).getByText("Email me"));
    expect(sw(container).getAttribute("aria-checked")).toBe("true");
  });

  it("reports booleans, controlled and uncontrolled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    const a = renderUi(<Switch label="A" onCheckedChange={(v) => seen.push(v)} />);
    await user.click(sw(a.container));
    await user.click(sw(a.container));
    expect(seen).toEqual([true, false]);
    a.unmount();

    function Controlled() {
      const [on, setOn] = useState(true);
      return <Switch label="B" checked={on} onCheckedChange={setOn} />;
    }
    const b = renderUi(<Controlled />);
    expect(sw(b.container).getAttribute("aria-checked")).toBe("true");
    await user.click(sw(b.container));
    expect(sw(b.container).getAttribute("aria-checked")).toBe("false");
  });

  it("description is the accessible description", () => {
    const { container } = renderUi(<Switch label="Email me" description="Once a week." />);
    const ids = (sw(container).getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    const text = ids.map((id) => document.getElementById(id)?.textContent).join(" ");
    expect(text).toContain("Once a week.");
  });

  it("error marks it invalid and shows the message", () => {
    const { container } = renderUi(<Switch label="Email me" error="Pick one." />);
    expect(sw(container).getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Pick one.");
  });

  it("required sets aria-required and shows the marker", () => {
    const { container } = renderUi(<Switch label="Email me" required />);
    expect(sw(container).getAttribute("aria-required")).toBe("true");
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    expect(hidden.map((el) => el.textContent)).toContain("*");
  });

  it("disabled does not change", async () => {
    const user = setupUser();
    const { container } = renderUi(<Switch label="Email me" disabled />);
    await user.click(sw(container));
    expect(sw(container).getAttribute("aria-checked")).toBe("false");
  });

  it("readOnly does not change", async () => {
    const user = setupUser();
    const onCheckedChange = vi.fn();
    const { container } = renderUi(
      <Switch label="Email me" readOnly onCheckedChange={onCheckedChange} />,
    );
    await user.click(sw(container));
    expect(sw(container).getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("posts its name only when on", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <Switch label="Email me" name="notify" />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).has("notify")).toBe(false);
    await user.click(sw(container));
    expect(new FormData(form).get("notify")).toBe("on");
  });

  it.each([
    ["sm", "min-h-8"],
    ["md", "min-h-(--density-control-height)"],
    ["lg", "min-h-11"],
  ] as const)("size %s sets the row to %s", (size, cls) => {
    const { container } = renderUi(<Switch label="Email me" size={size} />);
    expect(classes(container.querySelector("label"))).toContain(cls);
  });

  it("passes className through last, on the outermost element", () => {
    const { container } = renderUi(<Switch label="Email me" className="custom-row" />);
    expect(classes(container.firstElementChild).at(-1)).toBe("custom-row");
  });

  it("needs a name (the types enforce it)", () => {
    // @ts-expect-error a switch needs a label, aria-label or aria-labelledby
    const bad: SwitchProps = {};
    expect(bad).toBeTruthy();
    const { container } = renderUi(<Switch aria-label="Email me" />);
    expect(sw(container, "Email me")).toBeTruthy();
  });

  it("renders a label with markup as text, never as HTML", () => {
    const { container } = renderUi(<Switch label={"<b onclick=alert(1)>x</b>"} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b onclick=alert(1)>x</b>");
  });

  it("passes axe in light and dark", async () => {
    const tree = (
      <div>
        <Switch label="Off" />
        <Switch label="On" defaultChecked description="Described." />
        <Switch label="Bad" error="Required." required />
      </div>
    );
    const light = renderUi(tree);
    await expectNoA11yViolations(light.container);
    light.unmount();
    const dark = renderUi(<div className="dark">{tree}</div>);
    await expectNoA11yViolations(dark.container);
  });
});

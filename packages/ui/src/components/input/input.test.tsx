import { createRef } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Input } from "./input.js";

const q = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;

describe("Input: rendering", () => {
  it("renders a real <input> and forwards the ref to it", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderUi(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(q(container));
  });

  it("defaults to type=text and accepts other types", () => {
    const text = renderUi(<Input />);
    expect(q(text.container).type).toBe("text");
    const email = renderUi(<Input type="email" />);
    expect(q(email.container).type).toBe("email");
  });

  it("passes through native attributes", () => {
    const { container } = renderUi(
      <Input
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        maxLength={40}
        required
      />,
    );
    const input = q(container);
    expect(input.name).toBe("email");
    expect(input.placeholder).toBe("you@example.com");
    expect(input.autocomplete).toBe("email");
    expect(input.maxLength).toBe(40);
    expect(input.required).toBe(true);
  });

  it("follows the density tokens for its height and padding", () => {
    const { container } = renderUi(<Input />);
    expect(q(container).className).toContain("h-(--density-control-height)");
    expect(q(container).className).toContain("px-(--density-control-padding-x)");
  });

  it("lets className override defaults", () => {
    const { container } = renderUi(<Input className="h-12 rounded-none" />);
    const classes = q(container).className.split(/\s+/);
    expect(classes).toContain("h-12");
    expect(classes).not.toContain("h-(--density-control-height)");
    expect(classes).toContain("rounded-none");
    expect(classes).not.toContain("rounded-md");
  });

  it("uses a full-strength focus ring (WCAG 2.2 focus appearance), not a faded one", () => {
    const { container } = renderUi(<Input />);
    const classes = q(container).className.split(/\s+/);
    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes.some((c) => /^focus-visible:ring-ring\/\d+/.test(c))).toBe(false);
  });
});

describe("Input: behaviour", () => {
  it("is uncontrolled by default and keeps what the user types", async () => {
    const user = setupUser();
    const { container } = renderUi(<Input aria-label="name" />);
    await user.type(q(container), "Aroha");
    expect(q(container).value).toBe("Aroha");
  });

  it("supports defaultValue", () => {
    const { container } = renderUi(<Input aria-label="name" defaultValue="Mere" />);
    expect(q(container).value).toBe("Mere");
  });

  it("fires the native onChange and the typed onValueChange", async () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <Input aria-label="n" onChange={onChange} onValueChange={onValueChange} />,
    );
    await user.type(q(container), "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(["a", "ab"]);
  });

  it("works controlled", async () => {
    const user = setupUser();
    const seen: string[] = [];
    const { container, rerender } = renderUi(
      <Input aria-label="n" value="fixed" onValueChange={(v) => seen.push(v)} />,
    );
    await user.type(q(container), "x");
    expect(seen.length).toBeGreaterThan(0);
    expect(q(container).value).toBe("fixed");
    rerender(<Input aria-label="n" value="changed" onValueChange={() => {}} />);
    expect(q(container).value).toBe("changed");
  });

  it("ignores typing when disabled and is skipped by Tab", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Input aria-label="off" disabled />
        <Input aria-label="on" />
      </div>,
    );
    const [off, on] = Array.from(container.querySelectorAll("input"));
    await user.type(off as HTMLInputElement, "x");
    expect(off?.value).toBe("");
    await user.tab();
    expect(document.activeElement).toBe(on);
  });

  it("does not accept input when read-only but stays focusable", async () => {
    const user = setupUser();
    const { container } = renderUi(<Input aria-label="n" readOnly defaultValue="locked" />);
    await user.tab();
    expect(document.activeElement).toBe(q(container));
    await user.keyboard("zzz");
    expect(q(container).value).toBe("locked");
  });

  it("styles the invalid state from aria-invalid", () => {
    const { container } = renderUi(<Input aria-label="n" aria-invalid="true" />);
    expect(q(container).className).toContain("aria-invalid:border-destructive");
    expect(q(container).getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Input: react-hook-form", () => {
  function Form({ onSubmit }: { onSubmit: (values: { name: string }) => void }) {
    const { register, handleSubmit } = useForm<{ name: string }>({ defaultValues: { name: "" } });
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="name">Name</label>
        <Input id="name" {...register("name")} />
        <Button type="submit">Save</Button>
      </form>
    );
  }

  it("works through register() with no Controller, because the ref is the real input", async () => {
    const onSubmit = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Form onSubmit={onSubmit} />);
    await user.type(q(container), "Aroha");
    await user.click(container.querySelector("button[type=submit]") as HTMLButtonElement);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: "Aroha" });
  });
});

describe("Input: accessibility", () => {
  it("passes axe with an associated label", async () => {
    const { container } = renderUi(
      <div>
        <label htmlFor="e">Email</label>
        <Input id="e" type="email" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it("passes axe with aria-label, disabled and invalid states", async () => {
    const { container } = renderUi(
      <div>
        <Input aria-label="one" disabled />
        <Input aria-label="two" aria-invalid="true" aria-describedby="err" />
        <p id="err">Required</p>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});

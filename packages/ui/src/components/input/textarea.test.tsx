import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Textarea } from "./textarea.js";

const q = (container: HTMLElement) => container.querySelector("textarea") as HTMLTextAreaElement;

describe("Textarea: rendering", () => {
  it("renders a real <textarea> and forwards the ref to it", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { container } = renderUi(<Textarea ref={ref} aria-label="Notes" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(ref.current).toBe(q(container));
  });

  it("defaults to three rows and accepts others", () => {
    expect(q(renderUi(<Textarea aria-label="a" />).container).rows).toBe(3);
    expect(q(renderUi(<Textarea aria-label="b" rows={6} />).container).rows).toBe(6);
  });

  it("passes through native attributes", () => {
    const { container } = renderUi(
      <Textarea aria-label="Notes" name="notes" placeholder="Anything else?" maxLength={200} />,
    );
    expect(q(container).name).toBe("notes");
    expect(q(container).placeholder).toBe("Anything else?");
    expect(q(container).maxLength).toBe(200);
  });

  it("resizes vertically by default, and grows with its content with autoResize", () => {
    expect(q(renderUi(<Textarea aria-label="a" />).container).className).toContain("resize-y");
    const grows = q(renderUi(<Textarea aria-label="b" autoResize />).container);
    expect(grows.className).toContain("field-sizing-content");
    expect(grows.className).toContain("resize-none");
  });

  it("merges className", () => {
    const { container } = renderUi(<Textarea aria-label="Notes" className="min-h-40" />);
    expect(q(container).className).toContain("min-h-40");
    expect(q(container).className).toContain("rounded-md");
  });
});

describe("Textarea: value", () => {
  it("fires both the native onChange and the typed onValueChange", async () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <Textarea aria-label="Notes" onChange={onChange} onValueChange={onValueChange} />,
    );
    await user.type(q(container), "Kia ora");
    expect(onChange).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith("Kia ora");
  });

  it("keeps a default value uncontrolled", () => {
    const { container } = renderUi(<Textarea aria-label="Notes" defaultValue="Draft" />);
    expect(q(container).value).toBe("Draft");
  });

  it("is disabled", () => {
    const { container } = renderUi(<Textarea aria-label="Notes" disabled />);
    expect(q(container).disabled).toBe(true);
  });
});

describe("Textarea: accessibility", () => {
  it("passes axe with a label, and when disabled", async () => {
    const { container } = renderUi(
      <div>
        <label htmlFor="n">Notes</label>
        <Textarea id="n" />
        <Textarea aria-label="Locked" disabled />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});

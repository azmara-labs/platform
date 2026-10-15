import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Chip } from "./chip.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Chip", () => {
  it("renders its label and has no remove button unless asked", () => {
    const { container } = renderUi(<Chip>React</Chip>);
    expect(container.textContent).toBe("React");
    expect(container.querySelector("button")).toBeNull();
  });

  it("removes with a button named after the label", async () => {
    const onRemove = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Chip onRemove={onRemove}>React</Chip>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Remove React");
    expect(button.type).toBe("button");
    await user.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("can be removed with Enter and Space from the keyboard", async () => {
    const onRemove = vi.fn();
    const user = setupUser();
    renderUi(<Chip onRemove={onRemove}>React</Chip>);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it("takes a custom remove label (for non-text content or another language)", () => {
    const { container } = renderUi(
      <Chip onRemove={() => {}} removeLabel="Tango React">
        <i />
      </Chip>,
    );
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Tango React");
  });

  it("falls back to a plain 'Remove' when the label is not text and none is given", () => {
    const { container } = renderUi(
      <Chip onRemove={() => {}}>
        <i />
      </Chip>,
    );
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Remove");
  });

  it("shares Badge's variants and merges className and ref", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = renderUi(
      <Chip ref={ref} variant="success" className="px-4">
        ok
      </Chip>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(classes(container.firstElementChild)).toEqual(
      expect.arrayContaining(["text-success", "px-4"]),
    );
  });

  it("passes axe with a remove button", async () => {
    const { container } = renderUi(<Chip onRemove={() => {}}>React</Chip>);
    await expectNoA11yViolations(container);
  });
});

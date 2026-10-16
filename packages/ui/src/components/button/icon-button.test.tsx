import { Plus } from "lucide-react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Icon } from "../../icons/icon.js";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { IconButton } from "./icon-button.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const button = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;

describe("IconButton", () => {
  it("is a button named by its label, with a decorative icon", () => {
    const { container } = renderUi(<IconButton icon={<Icon icon={Plus} />} label="Add item" />);
    expect(button(container).getAttribute("aria-label")).toBe("Add item");
    expect(button(container).textContent).toBe("");
    expect(button(container).querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("requires an accessible name (the types enforce it)", () => {
    // @ts-expect-error a name is required: an icon alone cannot be announced
    const missing = <IconButton icon={<Icon icon={Plus} />} />;
    expect(missing).toBeTruthy();
  });

  it("a missing label in plain JavaScript gives a clear error, not a TypeError", () => {
    // TypeScript users get a compile error; JavaScript users get this message.
    expect(() =>
      renderUi(<IconButton icon={<Icon icon={Plus} />} label={undefined as never} />),
    ).toThrow(/IconButton: `label` must be a non-empty string/);
  });

  it("an empty label is not a name", () => {
    expect(() => renderUi(<IconButton icon={<Icon icon={Plus} />} label="" />)).toThrow(/label/i);
  });

  it("is square and follows the density token by default", () => {
    const { container } = renderUi(<IconButton icon={<Icon icon={Plus} />} label="Add" />);
    expect(classes(button(container))).toEqual(
      expect.arrayContaining(["size-(--density-control-height)", "p-0"]),
    );
  });

  it.each([
    ["sm", "size-8"],
    ["lg", "size-11"],
  ] as const)("size %s is %s", (size, cls) => {
    const { container } = renderUi(
      <IconButton icon={<Icon icon={Plus} />} label="Add" size={size} />,
    );
    expect(classes(button(container))).toContain(cls);
  });

  it("takes the Button variants", () => {
    const { container } = renderUi(
      <IconButton icon={<Icon icon={Plus} />} label="Delete" variant="destructive" />,
    );
    expect(classes(button(container))).toContain("bg-destructive");
  });

  it("is ghost by default, so a row of them is quiet", () => {
    const { container } = renderUi(<IconButton icon={<Icon icon={Plus} />} label="Add" />);
    expect(classes(button(container))).toContain("hover:bg-accent");
    expect(classes(button(container))).not.toContain("bg-primary");
  });

  it("runs onClick once, and not when disabled", async () => {
    const user = setupUser();
    const onClick = vi.fn();
    const a = renderUi(<IconButton icon={<Icon icon={Plus} />} label="Add" onClick={onClick} />);
    await user.click(button(a.container));
    expect(onClick).toHaveBeenCalledTimes(1);
    a.unmount();
    const b = renderUi(
      <IconButton icon={<Icon icon={Plus} />} label="Add" onClick={onClick} disabled />,
    );
    await user.click(button(b.container));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading swaps the icon for a spinner, is busy and ignores activation, but stays focusable", async () => {
    const user = setupUser();
    const onClick = vi.fn();
    const { container } = renderUi(
      <IconButton icon={<Icon icon={Plus} />} label="Saving" loading onClick={onClick} />,
    );
    expect(button(container).getAttribute("aria-busy")).toBe("true");
    expect(button(container).querySelector("svg.animate-spin")).not.toBeNull();
    // The icon steps aside: the spinner is the only graphic.
    expect(button(container).querySelectorAll("svg")).toHaveLength(1);
    await user.click(button(container));
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(document.activeElement).toBe(button(container));
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = renderUi(
      <IconButton ref={ref} icon={<Icon icon={Plus} />} label="Add" className="mt-2" />,
    );
    expect(ref.current).toBe(button(container));
    expect(classes(button(container))).toContain("mt-2");
  });

  it("passes axe", async () => {
    const { container } = renderUi(<IconButton icon={<Icon icon={Plus} />} label="Add item" />);
    await expectNoA11yViolations(container);
  });
});

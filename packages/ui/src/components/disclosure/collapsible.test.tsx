import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;
const content = (container: HTMLElement) => container.querySelector("[data-testid=body]");

function Basic(props: { defaultOpen?: boolean; disabled?: boolean }) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>
        <p data-testid="body">Hidden until opened</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible: behaviour", () => {
  it("is closed by default: the trigger says so and the content is not rendered", () => {
    const { container } = renderUi(<Basic />);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
    expect(content(container)).toBeNull();
  });

  it("opens and closes with a click", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await user.click(trigger(container));
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    expect(content(container)).not.toBeNull();
    await user.click(trigger(container));
    await vi.waitFor(() => expect(content(container)).toBeNull());
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens and closes with Enter and Space", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await user.tab();
    expect(document.activeElement).toBe(trigger(container));
    await user.keyboard("{Enter}");
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    await vi.waitFor(() => expect(trigger(container).getAttribute("aria-expanded")).toBe("false"));
  });

  it("supports defaultOpen", () => {
    const { container } = renderUi(<Basic defaultOpen />);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    expect(content(container)).not.toBeNull();
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Collapsible
          open={open}
          onOpenChange={(next) => {
            seen.push(next);
            setOpen(next);
          }}
        >
          <CollapsibleTrigger>t</CollapsibleTrigger>
          <CollapsibleContent>
            <p data-testid="body">x</p>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(trigger(container));
    expect(seen).toEqual([true]);
    expect(content(container)).not.toBeNull();
  });

  it("does nothing when disabled and is skipped by Tab", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic disabled />);
    expect(trigger(container).disabled || trigger(container).hasAttribute("data-disabled")).toBe(
      true,
    );
    await user.click(trigger(container));
    expect(content(container)).toBeNull();
  });
});

describe("Collapsible: motion and styling", () => {
  it("animates its height from the measured panel height with the motion tokens", () => {
    const { container } = renderUi(<Basic defaultOpen />);
    const panel = (content(container) as HTMLElement).closest(
      "[class*='collapsible-panel-height']",
    );
    const list = classes(panel);
    expect(list).toContain("h-(--collapsible-panel-height)");
    expect(list).toContain("data-[starting-style]:h-0");
    expect(list).toContain("data-[ending-style]:h-0");
    expect(list).toContain("duration-(--motion-duration-base)");
    expect(list).toContain("overflow-hidden");
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderUi(
      <Collapsible ref={ref} className="mt-4">
        <CollapsibleTrigger className="px-4">t</CollapsibleTrigger>
        <CollapsibleContent className="p-2">x</CollapsibleContent>
      </Collapsible>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(classes(container.firstElementChild)).toContain("mt-4");
    expect(classes(trigger(container))).toContain("px-4");
  });
});

describe("Collapsible: accessibility", () => {
  it("passes axe closed and open", async () => {
    const closed = renderUi(<Basic />);
    await expectNoA11yViolations(closed.container);
    const open = renderUi(<Basic defaultOpen />);
    await expectNoA11yViolations(open.container);
  });

  it("links the trigger to its panel when open (aria-controls)", () => {
    const { container } = renderUi(<Basic defaultOpen />);
    const id = trigger(container).getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).not.toBeNull();
  });
});

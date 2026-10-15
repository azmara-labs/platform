import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { TOOLTIP_CLOSE_DELAY_MS, TOOLTIP_DELAY_MS } from "./delays.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const tip = () => document.querySelector("[role=tooltip]") as HTMLElement | null;
const button = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;

function Demo(props: { delay?: number; disabled?: boolean; side?: "top" | "bottom" }) {
  const { delay = 0, disabled, side } = props;
  return (
    <Tooltip disabled={disabled}>
      <TooltipTrigger delay={delay} render={<button type="button">Save</button>} />
      <TooltipContent side={side}>Save the document</TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip: opening", () => {
  it("is not in the DOM until it is wanted", () => {
    renderUi(<Demo />);
    expect(tip()).toBeNull();
  });

  it("opens when the trigger is hovered", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()?.textContent).toBe("Save the document"));
  });

  it("opens when the trigger receives keyboard focus, and describes the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    expect(document.activeElement).toBe(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    // The tooltip is the trigger's description, so screen readers announce it with the button.
    const describedBy = button(container).getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe("Save the document");
  });

  it("waits for the delay before opening on hover", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo delay={400} />);
    await user.hover(button(container));
    expect(tip()).toBeNull();
    await vi.waitFor(() => expect(tip()).not.toBeNull(), { timeout: 2000 });
  });

  it("never opens when disabled", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo disabled />);
    await user.hover(button(container));
    await user.tab();
    await new Promise((r) => setTimeout(r, 60));
    expect(tip()).toBeNull();
  });

  it("does not open on a press alone moving focus elsewhere (no stuck tooltip)", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Demo />
        <button type="button">Other</button>
      </div>,
    );
    await user.tab();
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    await user.tab();
    await vi.waitFor(() => expect(tip()).toBeNull());
    expect(document.activeElement).toBe(container.querySelectorAll("button")[1]);
  });
});

describe("Tooltip: ARIA link", () => {
  it("has the tooltip role, and the trigger points at it only while it is showing", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    expect(button(container).hasAttribute("aria-describedby")).toBe(false);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(button(container).getAttribute("aria-describedby")).toBe(tip()?.id);
    await user.unhover(button(container));
    await vi.waitFor(() => expect(tip()).toBeNull());
    expect(button(container).hasAttribute("aria-describedby")).toBe(false);
  });

  it("two tooltips on one page do not share an id", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Demo />
        <Demo />
      </div>,
    );
    const [a, b] = Array.from(container.querySelectorAll("button"));
    await user.hover(a as HTMLElement);
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    const first = tip()?.id;
    await user.unhover(a as HTMLElement);
    await vi.waitFor(() => expect(tip()).toBeNull());
    await user.hover(b as HTMLElement);
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(tip()?.id).not.toBe(first);
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    const { container, rerender } = renderUi(
      <Tooltip open onOpenChange={(next) => seen.push(next)}>
        <TooltipTrigger delay={0} render={<button type="button">Save</button>} />
        <TooltipContent>Save the document</TooltipContent>
      </Tooltip>,
    );
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(seen).toContain(false));
    expect(tip()).not.toBeNull(); // still open: the parent has not agreed
    rerender(
      <Tooltip open={false}>
        <TooltipTrigger delay={0} render={<button type="button">Save</button>} />
        <TooltipContent>Save the document</TooltipContent>
      </Tooltip>,
    );
    await vi.waitFor(() => expect(tip()).toBeNull());
    expect(button(container).hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("Tooltip: dismissing", () => {
  it("closes on Escape and leaves focus on the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(tip()).toBeNull());
    expect(document.activeElement).toBe(button(container));
  });

  it("closes when the pointer leaves", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    await user.unhover(button(container));
    await vi.waitFor(() => expect(tip()).toBeNull());
  });
});

describe("Tooltip: structure and styling", () => {
  it("renders in a portal on document.body, above overlays, not inside the trigger's container", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(container.contains(tip())).toBe(false);
    const positioner = tip()?.parentElement as HTMLElement;
    expect(classes(positioner)).toContain("z-(--z-tooltip)");
  });

  it("is positioned on the requested side (and says so for styling)", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo side="bottom" />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(tip()?.getAttribute("data-side")).toBe("bottom");
  });

  it("fades and scales with the motion tokens and starts from the anchor", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    const list = classes(tip());
    expect(list).toEqual(
      expect.arrayContaining([
        "origin-(--transform-origin)",
        "transition-[opacity,scale]",
        "duration-(--motion-duration-fast)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[starting-style]:scale-95",
        "data-[ending-style]:scale-95",
        // Moving from one tooltip to the next must not replay the animation.
        "data-[instant]:transition-none",
      ]),
    );
  });

  it("uses inverse token colours (readable on any surface) and the elevation scale", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(classes(tip())).toEqual(
      expect.arrayContaining(["bg-foreground", "text-background", "shadow-elevation-2"]),
    );
  });

  it("does not catch the pointer, so it never blocks what is under it", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    expect(classes(tip())).toContain("pointer-events-none");
  });
});

describe("Tooltip: delay tokens and provider", () => {
  it("exports the shared delays", () => {
    expect(TOOLTIP_DELAY_MS).toBe(500);
    expect(TOOLTIP_CLOSE_DELAY_MS).toBe(0);
  });

  it("a provider shares its delay with every tooltip inside it", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger render={<button type="button">A</button>} />
          <TooltipContent>Tip A</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(button(container));
    await vi.waitFor(() => expect(tip()?.textContent).toBe("Tip A"));
  });

  it("the provider default is the shared delay token", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<button type="button">A</button>} />
          <TooltipContent>Tip A</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(button(container));
    await new Promise((r) => setTimeout(r, 150));
    expect(tip()).toBeNull(); // 500 ms default, not yet
    await vi.waitFor(() => expect(tip()).not.toBeNull(), { timeout: 2500 });
  });
});

describe("Tooltip: accessibility", () => {
  it("passes axe closed and open", async () => {
    const user = setupUser();
    renderUi(<Demo />);
    await expectNoA11yViolations(document.body);
    await user.tab();
    await vi.waitFor(() => expect(tip()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});

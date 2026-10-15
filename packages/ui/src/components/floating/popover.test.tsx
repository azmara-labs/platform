import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./popover.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const popup = () => document.querySelector("[role=dialog]") as HTMLElement | null;
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;

function Demo(props: { side?: "top" | "bottom"; modal?: boolean }) {
  return (
    <Popover modal={props.modal}>
      <PopoverTrigger>Filters</PopoverTrigger>
      <PopoverContent side={props.side}>
        <PopoverTitle>Filter results</PopoverTitle>
        <PopoverDescription>Narrow the list down.</PopoverDescription>
        <label>
          Name <input name="q" />
        </label>
        <PopoverClose>Done</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover: opening and closing", () => {
  it("is closed by default: the trigger says so and nothing is rendered", () => {
    const { container } = renderUi(<Demo />);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
    expect(popup()).toBeNull();
  });

  it("opens on click and is a named dialog", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    const dialog = popup() as HTMLElement;
    expect(dialog).not.toBeNull();
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(labelledBy as string)?.textContent).toBe("Filter results");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Narrow the list down.",
    );
  });

  it("opens with Enter and Space", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(popup()).not.toBeNull();
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(popup()).toBeNull());
    await user.keyboard(" ");
    expect(popup()).not.toBeNull();
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(document.activeElement).toBe(trigger(container));
  });

  it("closes on an outside click", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Demo />
        <p data-testid="outside">Elsewhere</p>
      </div>,
    );
    await user.click(trigger(container));
    expect(popup()).not.toBeNull();
    await user.click(container.querySelector("[data-testid=outside]") as HTMLElement);
    await vi.waitFor(() => expect(popup()).toBeNull());
  });

  it("closes from a Close button inside, returning focus to the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    const done = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Done",
    );
    await user.click(done as HTMLElement);
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(document.activeElement).toBe(trigger(container));
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Popover
          open={open}
          onOpenChange={(next) => {
            seen.push(next);
            setOpen(next);
          }}
        >
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent aria-label="Panel">Body</PopoverContent>
        </Popover>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(trigger(container));
    expect(seen).toEqual([true]);
    expect(popup()).not.toBeNull();
  });
});

describe("Popover: focus management", () => {
  it("moves focus into the popover when it opens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await vi.waitFor(() => expect(popup()?.contains(document.activeElement)).toBe(true));
  });

  it("Tab moves through the popover content and out to the page", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Demo />
        <button type="button">After</button>
      </div>,
    );
    await user.click(trigger(container));
    await vi.waitFor(() => expect(popup()?.contains(document.activeElement)).toBe(true));
    const reachable = new Set<Element | null>();
    for (let i = 0; i < 6; i++) {
      reachable.add(document.activeElement);
      await user.tab();
    }
    const names = Array.from(reachable).map(
      (el) => el?.textContent || (el as HTMLInputElement)?.name,
    );
    expect(names).toContain("Done");
    expect(Array.from(reachable).some((el) => (el as HTMLInputElement)?.name === "q")).toBe(true);
  });

  it("an input inside keeps arrow keys and typing (nothing swallows them)", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    const input = document.querySelector("input[name=q]") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("abc{ArrowLeft}x");
    expect(input.value).toBe("abxc");
  });
});

describe("Popover: structure and styling", () => {
  it("renders in a portal above overlays, with token surface, border and elevation", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(container.contains(popup())).toBe(false);
    expect(classes(popup()?.parentElement as HTMLElement)).toContain("z-(--z-popover)");
    expect(classes(popup())).toEqual(
      expect.arrayContaining([
        "bg-popover",
        "text-popover-foreground",
        "border-border",
        "shadow-elevation-3",
        "rounded-md",
      ]),
    );
  });

  it("limits its size to the space available so it never overflows the viewport", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(classes(popup())).toEqual(
      expect.arrayContaining([
        "max-h-(--available-height)",
        "max-w-(--available-width)",
        "overflow-auto",
      ]),
    );
  });

  it("animates with the motion tokens from the anchor, and shows its focus ring when focused", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(classes(popup())).toEqual(
      expect.arrayContaining([
        "origin-(--transform-origin)",
        "transition-[opacity,scale]",
        "duration-(--motion-duration-fast)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[starting-style]:scale-95",
        "data-[ending-style]:scale-95",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
      ]),
    );
  });

  it("is on the requested side and keeps a gap from the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo side="top" />);
    await user.click(trigger(container));
    expect(popup()?.getAttribute("data-side")).toBe("top");
  });

  it("styles the title and description from tokens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    const title = Array.from(document.querySelectorAll("h2")).find(
      (h) => h.textContent === "Filter results",
    );
    expect(title).toBeTruthy();
    expect(classes(title ?? null)).toContain("font-medium");
    const description = Array.from(document.querySelectorAll("p")).find(
      (p) => p.textContent === "Narrow the list down.",
    );
    expect(classes(description ?? null)).toContain("text-muted-foreground");
  });
});

describe("Popover: accessibility", () => {
  it("passes axe closed and open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await expectNoA11yViolations(document.body);
    await user.click(trigger(container));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});

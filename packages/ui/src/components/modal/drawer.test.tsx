import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer.js";

type Side = "top" | "right" | "bottom" | "left";
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const drawer = () => document.querySelector("[role=dialog]") as HTMLElement | null;
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;
const inDrawer = (label: string) =>
  Array.from(document.querySelectorAll("[role=dialog] button")).find(
    (b) => b.textContent === label || b.getAttribute("aria-label") === label,
  ) as HTMLButtonElement;

function Demo(props: { side?: Side; showClose?: boolean }) {
  return (
    <div>
      <p>Page</p>
      <Drawer side={props.side}>
        <DrawerTrigger>Open filters</DrawerTrigger>
        <DrawerContent showClose={props.showClose}>
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Narrow the list.</DrawerDescription>
          </DrawerHeader>
          <label>
            Name <input name="q" />
          </label>
          <DrawerFooter>
            <DrawerClose>Apply</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

describe("Drawer: behaviour", () => {
  it("opens as a modal dialog named by its title and described by its description", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    expect(drawer()).toBeNull();
    await user.click(trigger(container));
    const d = drawer() as HTMLElement;
    expect(d).not.toBeNull();
    expect(document.getElementById(d.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Filters",
    );
    expect(document.getElementById(d.getAttribute("aria-describedby") as string)?.textContent).toBe(
      "Narrow the list.",
    );
  });

  it("declares itself modal for assistive technology", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(drawer()?.getAttribute("aria-modal")).toBe("true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(drawer()).toBeNull());
    expect(document.activeElement).toBe(trigger(container));
  });

  it("closes on a click on the scrim", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await user.click(document.querySelector("[data-azmr-backdrop]") as HTMLElement);
    await vi.waitFor(() => expect(drawer()).toBeNull());
  });

  it("closes from a Close button and from the corner button", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await user.click(inDrawer("Apply"));
    await vi.waitFor(() => expect(drawer()).toBeNull());
    await user.click(trigger(container));
    await user.click(inDrawer("Close"));
    await vi.waitFor(() => expect(drawer()).toBeNull());
  });

  it("traps focus while open and locks the page behind it", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await vi.waitFor(() => expect(drawer()?.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 6; i++) {
      await user.tab();
      await vi.waitFor(() =>
        expect(drawer()?.contains(document.activeElement), `Tab #${i + 1}`).toBe(true),
      );
    }
    expect(container.querySelector("p")?.closest("[inert], [aria-hidden=true]")).not.toBeNull();
  });

  it("keeps typing working inside fields", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    const input = document.querySelector("input[name=q]") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("abc{ArrowLeft}x");
    expect(input.value).toBe("abxc");
    expect(drawer()).not.toBeNull();
  });
});

describe("Drawer: edges and swipe direction", () => {
  // Swiping toward the edge it came from dismisses it: a right drawer swipes right, a bottom one down.
  it.each([
    ["right", "right"],
    ["left", "left"],
    ["top", "up"],
    ["bottom", "down"],
  ] as const)("a %s drawer is dismissed by swiping %s", async (side, swipe) => {
    const user = setupUser();
    const { container } = renderUi(<Demo side={side} />);
    await user.click(trigger(container));
    expect(drawer()?.getAttribute("data-swipe-direction")).toBe(swipe);
  });

  it("defaults to the right edge", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(drawer()?.getAttribute("data-swipe-direction")).toBe("right");
  });

  it.each([
    [
      "right",
      [
        "right-0",
        "inset-y-0",
        "border-l",
        "data-[starting-style]:translate-x-full",
        "data-[ending-style]:translate-x-full",
      ],
    ],
    [
      "left",
      [
        "left-0",
        "inset-y-0",
        "border-r",
        "data-[starting-style]:-translate-x-full",
        "data-[ending-style]:-translate-x-full",
      ],
    ],
    [
      "top",
      [
        "top-0",
        "inset-x-0",
        "border-b",
        "data-[starting-style]:-translate-y-full",
        "data-[ending-style]:-translate-y-full",
      ],
    ],
    [
      "bottom",
      [
        "bottom-0",
        "inset-x-0",
        "border-t",
        "data-[starting-style]:translate-y-full",
        "data-[ending-style]:translate-y-full",
      ],
    ],
  ] as const)("a %s drawer is anchored to that edge and slides from it", async (side, expected) => {
    const user = setupUser();
    const { container } = renderUi(<Demo side={side} />);
    await user.click(trigger(container));
    expect(classes(drawer())).toEqual(expect.arrayContaining([...expected]));
  });

  it("follows the finger while swiping, then animates the rest on the motion tokens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(classes(drawer())).toEqual(
      expect.arrayContaining([
        "translate-x-(--drawer-swipe-movement-x)",
        "transition-[translate]",
        "duration-(--motion-duration-slow)",
        // Direct manipulation must track the finger exactly, with no easing lag.
        "data-[swiping]:transition-none",
      ]),
    );
  });

  it("a top or bottom drawer follows the finger vertically", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo side="bottom" />);
    await user.click(trigger(container));
    expect(classes(drawer())).toContain("translate-y-(--drawer-swipe-movement-y)");
  });

  it("the scrim fades as the drawer is swiped away", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    const backdrop = document.querySelector("[data-azmr-backdrop]");
    expect(classes(backdrop)).toEqual(
      expect.arrayContaining([
        "bg-scrim",
        "z-(--z-overlay)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[swiping]:transition-none",
      ]),
    );
    expect(classes(backdrop).some((c) => c.includes("--drawer-swipe-progress"))).toBe(true);
  });
});

describe("Drawer: structure and styling", () => {
  it("sits above the scrim on token surfaces, and scrolls when tall", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(classes(drawer())).toEqual(
      expect.arrayContaining([
        "bg-background",
        "text-foreground",
        "border-border",
        "shadow-elevation-4",
        "overflow-y-auto",
        "overscroll-contain",
      ]),
    );
    expect(classes((drawer() as HTMLElement).parentElement)).toContain("z-(--z-modal)");
  });

  it("has a labelled corner close button unless turned off", async () => {
    const user = setupUser();
    const a = renderUi(<Demo />);
    await user.click(trigger(a.container));
    expect(inDrawer("Close")).toBeTruthy();
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(drawer()).toBeNull());
    a.unmount();
    const b = renderUi(<Demo showClose={false} />);
    await user.click(trigger(b.container));
    expect(inDrawer("Close")).toBeUndefined();
  });

  it("passes axe closed and open on every edge", async () => {
    const user = setupUser();
    for (const side of ["right", "left", "top", "bottom"] as const) {
      const { container, unmount } = renderUi(<Demo side={side} />);
      await user.click(trigger(container));
      await vi.waitFor(() => expect(drawer()).not.toBeNull());
      await expectNoA11yViolations(document.body);
      await user.keyboard("{Escape}");
      await vi.waitFor(() => expect(drawer()).toBeNull());
      unmount();
    }
  });
});

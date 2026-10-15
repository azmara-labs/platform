import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const dialogs = () => Array.from(document.querySelectorAll("[role=dialog]")) as HTMLElement[];
const dialog = () => dialogs()[0] ?? null;
const named = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement;
const inDialog = (label: string) =>
  Array.from(document.querySelectorAll("[role=dialog] button")).find(
    (b) => b.textContent === label || b.getAttribute("aria-label") === label,
  ) as HTMLButtonElement;

function Demo(props: {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
  disablePointerDismissal?: boolean;
}) {
  return (
    <div>
      <p>Page content</p>
      <Dialog disablePointerDismissal={props.disablePointerDismissal}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent size={props.size} showClose={props.showClose}>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Change how you appear to others.</DialogDescription>
          </DialogHeader>
          <label>
            Name <input name="name" />
          </label>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <button type="button">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

describe("Dialog: opening and closing", () => {
  it("renders nothing until opened", () => {
    renderUi(<Demo />);
    expect(dialog()).toBeNull();
  });

  it("opens from the trigger as a modal dialog named by its title and described by its description", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    const d = dialog() as HTMLElement;
    expect(d).not.toBeNull();
    expect(document.getElementById(d.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Edit profile",
    );
    expect(document.getElementById(d.getAttribute("aria-describedby") as string)?.textContent).toBe(
      "Change how you appear to others.",
    );
    expect(named(container, "Open").getAttribute("aria-expanded")).toBe("true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(named(container, "Open"));
  });

  it("closes on a click outside (on the backdrop) and returns focus", async () => {
    // Base UI returns focus after an outside press only where `focus({ preventScroll })` is
    // supported (every current browser); jsdom ignores the option, so emulate that support.
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
      void options?.preventScroll;
      return originalFocus.call(this, options);
    };
    const restore = () => {
      HTMLElement.prototype.focus = originalFocus;
    };
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    const backdrop = document.querySelector("[data-azmr-backdrop]") as HTMLElement;
    expect(backdrop).not.toBeNull();
    try {
      await user.click(backdrop);
      await vi.waitFor(() => expect(dialog()).toBeNull());
      expect(document.activeElement).toBe(named(container, "Open"));
    } finally {
      restore();
    }
  });

  it("stays open on an outside click when pointer dismissal is disabled", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo disablePointerDismissal />);
    await user.click(named(container, "Open"));
    await user.click(document.querySelector("[data-azmr-backdrop]") as HTMLElement);
    await new Promise((r) => setTimeout(r, 50));
    expect(dialog()).not.toBeNull();
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog()).toBeNull());
  });

  it("closes from a Close button inside", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    await user.click(inDialog("Cancel"));
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(named(container, "Open"));
  });

  it("has a labelled close button by default, and none with showClose={false}", async () => {
    const user = setupUser();
    const a = renderUi(<Demo />);
    await user.click(named(a.container, "Open"));
    const x = inDialog("Close");
    expect(x).toBeTruthy();
    expect(x.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    await user.click(x);
    await vi.waitFor(() => expect(dialog()).toBeNull());
    a.unmount();

    const b = renderUi(<Demo showClose={false} />);
    await user.click(named(b.container, "Open"));
    expect(inDialog("Close")).toBeUndefined();
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            seen.push(next);
            setOpen(next);
          }}
        >
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
          </DialogContent>
        </Dialog>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(named(container, "Open"));
    expect(seen).toEqual([true]);
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(seen).toEqual([true, false]));
  });
});

describe("Dialog: focus", () => {
  it("moves focus into the dialog when it opens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    await vi.waitFor(() => expect(dialog()?.contains(document.activeElement)).toBe(true));
  });

  it("traps Tab and Shift+Tab inside the dialog", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <button type="button">Before</button>
        <Demo />
        <button type="button">After</button>
      </div>,
    );
    await user.click(named(container, "Open"));
    await vi.waitFor(() => expect(dialog()?.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 8; i++) {
      await user.tab();
      // At the end of the dialog focus hops via a guard element and is sent back on the next tick.
      await vi.waitFor(() =>
        expect(dialog()?.contains(document.activeElement), `Tab #${i + 1}`).toBe(true),
      );
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true });
      await vi.waitFor(() =>
        expect(dialog()?.contains(document.activeElement), `Shift+Tab #${i + 1}`).toBe(true),
      );
    }
  });

  it("makes the page behind it unreachable for assistive technology while open, and reachable again after", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    const page = container.querySelector("p") as HTMLElement;
    await user.click(named(container, "Open"));
    const hidden = (el: Element) => el.closest("[inert], [aria-hidden=true]") !== null;
    await vi.waitFor(() => expect(hidden(page)).toBe(true));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog()).toBeNull());
    await vi.waitFor(() => expect(hidden(page)).toBe(false));
  });

  it("locks page scroll while open and restores it on close", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    const locked = () =>
      document.body.style.overflowY === "hidden" ||
      document.documentElement.style.overflowY === "hidden";
    expect(locked()).toBe(false);
    await user.click(named(container, "Open"));
    await vi.waitFor(() => expect(locked()).toBe(true));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog()).toBeNull());
    await vi.waitFor(() => expect(locked()).toBe(false));
  });

  it("keeps typing and arrow keys working inside fields", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    const input = document.querySelector("input[name=name]") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("abc{ArrowLeft}x");
    expect(input.value).toBe("abxc");
    expect(dialog()).not.toBeNull();
  });
});

describe("Dialog: stacked dialogs", () => {
  function Stack() {
    return (
      <Dialog>
        <DialogTrigger>Open outer</DialogTrigger>
        <DialogContent>
          <DialogTitle>Outer</DialogTitle>
          <DialogDescription>First level.</DialogDescription>
          <Dialog>
            <DialogTrigger>Open inner</DialogTrigger>
            <DialogContent size="sm">
              <DialogTitle>Inner</DialogTitle>
              <DialogDescription>Second level.</DialogDescription>
              <DialogClose>Done</DialogClose>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );
  }

  it("Escape closes only the top dialog, then the next", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stack />);
    await user.click(named(container, "Open outer"));
    await user.click(inDialog("Open inner"));
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    expect(dialog()?.textContent).toContain("First level.");
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialogs()).toHaveLength(0));
  });

  it("returns focus to the inner trigger (inside the outer dialog) when the inner one closes", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stack />);
    await user.click(named(container, "Open outer"));
    const innerTrigger = inDialog("Open inner");
    await user.click(innerTrigger);
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    await user.click(inDialog("Done"));
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    await vi.waitFor(() => expect(document.activeElement).toBe(innerTrigger));
  });

  it("keeps focus trapped in the top dialog only", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stack />);
    await user.click(named(container, "Open outer"));
    await user.click(inDialog("Open inner"));
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    const inner = dialogs().find((d) => d.textContent?.includes("Second level.")) as HTMLElement;
    for (let i = 0; i < 6; i++) {
      await user.tab();
      await vi.waitFor(() =>
        expect(inner.contains(document.activeElement), `Tab #${i + 1}`).toBe(true),
      );
    }
  });

  it("each dialog is named by its own title", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stack />);
    await user.click(named(container, "Open outer"));
    await user.click(inDialog("Open inner"));
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    const names = dialogs().map(
      (d) => document.getElementById(d.getAttribute("aria-labelledby") as string)?.textContent,
    );
    expect(names.sort()).toEqual(["Inner", "Outer"]);
  });

  it("passes axe with two dialogs open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Stack />);
    await user.click(named(container, "Open outer"));
    await user.click(inDialog("Open inner"));
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    await expectNoA11yViolations(document.body);
  });
});

describe("Dialog: structure and styling", () => {
  it("renders in a portal, scrim behind the dialog, both above the page", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    expect(container.contains(dialog())).toBe(false);
    const backdrop = document.querySelector("[data-azmr-backdrop]") as HTMLElement;
    expect(classes(backdrop)).toEqual(
      expect.arrayContaining(["fixed", "inset-0", "bg-scrim", "z-(--z-overlay)"]),
    );
    const viewport = (dialog() as HTMLElement).parentElement as HTMLElement;
    expect(classes(viewport)).toContain("z-(--z-modal)");
  });

  it("fades the scrim and scales the dialog in and out with the motion tokens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    expect(classes(document.querySelector("[data-azmr-backdrop]"))).toEqual(
      expect.arrayContaining([
        "transition-opacity",
        "duration-(--motion-duration-base)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
      ]),
    );
    expect(classes(dialog())).toEqual(
      expect.arrayContaining([
        "transition-[opacity,scale]",
        "duration-(--motion-duration-base)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[starting-style]:scale-95",
        "data-[ending-style]:scale-95",
      ]),
    );
  });

  it("uses token surface, border and elevation, with a full-strength focus ring", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    expect(classes(dialog())).toEqual(
      expect.arrayContaining([
        "bg-background",
        "text-foreground",
        "border-border",
        "shadow-elevation-4",
        "rounded-lg",
      ]),
    );
    expect(classes(inDialog("Close"))).toContain("focus-visible:ring-ring");
  });

  it.each([
    ["sm", "max-w-sm"],
    ["md", "max-w-lg"],
    ["lg", "max-w-2xl"],
    ["xl", "max-w-4xl"],
    ["full", "max-w-[calc(100vw-2rem)]"],
  ] as const)("size %s is %s", async (size, cls) => {
    const user = setupUser();
    const { container } = renderUi(<Demo size={size} />);
    await user.click(named(container, "Open"));
    expect(classes(dialog())).toContain(cls);
  });

  it("declares itself modal for assistive technology", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    expect(dialog()?.getAttribute("aria-modal")).toBe("true");
  });

  it("does not claim to be modal when modal={false}", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Dialog modal={false}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Non-modal</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(named(container, "Open"));
    expect(dialog()).not.toBeNull();
    expect(dialog()?.hasAttribute("aria-modal")).toBe(false);
  });

  it("is medium by default", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    expect(classes(dialog())).toContain("max-w-lg");
  });

  it("scrolls inside the viewport when its content is taller than the screen", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    const viewport = (dialog() as HTMLElement).parentElement as HTMLElement;
    expect(classes(viewport)).toEqual(
      expect.arrayContaining(["overflow-y-auto", "overscroll-contain"]),
    );
    expect(classes(dialog())).toContain("my-auto");
  });

  it("stacks title, description and footer actions responsively", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(named(container, "Open"));
    const footer = inDialog("Cancel").parentElement as HTMLElement;
    expect(classes(footer)).toEqual(
      expect.arrayContaining(["flex", "flex-col-reverse", "sm:flex-row", "sm:justify-end"]),
    );
    const title = document.getElementById(dialog()?.getAttribute("aria-labelledby") as string);
    expect(classes(title)).toContain("font-semibold");
    const description = document.getElementById(
      dialog()?.getAttribute("aria-describedby") as string,
    );
    expect(classes(description)).toContain("text-muted-foreground");
  });
});

describe("Dialog: accessibility", () => {
  it("passes axe closed and open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await expectNoA11yViolations(document.body);
    await user.click(named(container, "Open"));
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});

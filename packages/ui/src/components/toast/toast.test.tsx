import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { toast } from "./toast.js";
import { Toaster } from "./toaster.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const region = () => document.querySelector("[aria-label='Notifications']") as HTMLElement | null;
const toasts = () => Array.from(document.querySelectorAll("[data-toast]")) as HTMLElement[];
const texts = () => toasts().map((t) => t.textContent ?? "");
const has = (text: string) => texts().some((t) => t.includes(text));
const gone = (text: string) => vi.waitFor(() => expect(has(text)).toBe(false), { timeout: 3000 });
const shown = (text: string) => vi.waitFor(() => expect(has(text)).toBe(true));

// Every test mounts its own Toaster; clear anything still queued on the shared manager.
afterEach(() => act(() => toast.dismiss()));

describe("Toaster and toast: showing", () => {
  it("renders a labelled notifications region, empty until a toast is shown", () => {
    renderUi(<Toaster />);
    expect(region()).not.toBeNull();
    expect(toasts()).toHaveLength(0);
  });

  it("shows a title and a description", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Saved", { description: "Your changes are live." });
    });
    await shown("Saved");
    expect(texts()[0]).toContain("Your changes are live.");
  });

  it("returns an id, and accepts one of your own", async () => {
    renderUi(<Toaster />);
    let a = "";
    let b = "";
    act(() => {
      a = toast("One");
      b = toast("Two", { id: "mine" });
    });
    expect(a).toBeTruthy();
    expect(b).toBe("mine");
    await shown("Two");
  });

  it("the region can be renamed", () => {
    renderUi(<Toaster label="Alerts" />);
    expect(document.querySelector("[aria-label='Alerts']")).not.toBeNull();
  });
});

describe("toast: types", () => {
  it.each([
    ["success", "text-success"],
    ["error", "text-destructive"],
    ["warning", "text-warning-text"],
    ["info", "text-info"],
  ] as const)(
    "%s has its own icon in a readable token colour, hidden from assistive technology",
    async (type, colour) => {
      renderUi(<Toaster />);
      act(() => {
        toast[type](`A ${type} message`);
      });
      await shown(`A ${type} message`);
      const el = toasts()[0] as HTMLElement;
      expect(el.getAttribute("data-type")).toBe(type);
      const icon = el.querySelector("svg") as SVGElement;
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(classes(icon)).toContain(colour);
    },
  );

  it("loading shows a spinner and stays until it is updated or dismissed", async () => {
    renderUi(<Toaster duration={50} />);
    act(() => {
      toast.loading("Uploading");
    });
    await shown("Uploading");
    expect(toasts()[0]?.getAttribute("data-type")).toBe("loading");
    expect(toasts()[0]?.querySelector("svg.animate-spin")).not.toBeNull();
    await new Promise((r) => setTimeout(r, 400));
    expect(has("Uploading")).toBe(true);
  });

  it("a plain toast has no type icon", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Plain");
    });
    await shown("Plain");
    expect(toasts()[0]?.querySelector("svg[data-azmr-toast-icon]")).toBeNull();
  });
});

describe("toast: announcements", () => {
  it("the region is a polite live region", () => {
    renderUi(<Toaster />);
    expect(region()?.getAttribute("aria-live")).toBe("polite");
    expect(region()?.getAttribute("role")).toBe("region");
  });

  it("errors are announced urgently (role=alert); the rest politely", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast.success("All good");
    });
    await shown("All good");
    expect(document.querySelector("[role=alert]")).toBeNull();
    act(() => {
      toast.error("It broke");
    });
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("It broke"),
    );
  });

  it("priority can be set explicitly", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast.info("Heads up", { priority: "high" });
    });
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("Heads up"),
    );
  });

  it("F6 moves focus into the notifications region", async () => {
    const user = setupUser();
    renderUi(
      <div>
        <button type="button">Page</button>
        <Toaster />
      </div>,
    );
    act(() => {
      toast("Hello");
    });
    await shown("Hello");
    await user.tab();
    await user.keyboard("{F6}");
    await vi.waitFor(() => expect(region()?.contains(document.activeElement)).toBe(true));
  });
});

describe("toast: action and close", () => {
  it("shows an action button that runs once and dismisses the toast", async () => {
    const user = setupUser();
    const onClick = vi.fn();
    renderUi(<Toaster />);
    act(() => {
      toast("Deleted", { action: { label: "Undo", onClick } });
    });
    await shown("Deleted");
    const undo = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Undo",
    ) as HTMLElement;
    await user.click(undo);
    expect(onClick).toHaveBeenCalledTimes(1);
    await gone("Deleted");
  });

  it("has a labelled close button that dismisses it", async () => {
    const user = setupUser();
    renderUi(<Toaster />);
    act(() => {
      toast("Closable");
    });
    await shown("Closable");
    const close = document.querySelector(
      "button[aria-label='Dismiss notification']",
    ) as HTMLElement;
    expect(close.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    await user.click(close);
    await gone("Closable");
  });

  it("calls onClose when dismissed", async () => {
    const user = setupUser();
    const onClose = vi.fn();
    renderUi(<Toaster />);
    act(() => {
      toast("Bye", { onClose });
    });
    await shown("Bye");
    await user.click(
      document.querySelector("button[aria-label='Dismiss notification']") as HTMLElement,
    );
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe("toast: timing", () => {
  it("dismisses itself after the duration", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Short", { duration: 120 });
    });
    await shown("Short");
    await gone("Short");
  });

  it("the Toaster sets the default duration", async () => {
    renderUi(<Toaster duration={120} />);
    act(() => {
      toast("Default");
    });
    await shown("Default");
    await gone("Default");
  });

  it("duration 0 keeps it until dismissed", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Sticky", { duration: 0 });
    });
    await shown("Sticky");
    await new Promise((r) => setTimeout(r, 400));
    expect(has("Sticky")).toBe(true);
  });

  it("pauses while the pointer is over the region, and resumes after", async () => {
    const user = setupUser();
    renderUi(<Toaster duration={400} />);
    act(() => {
      toast("Hover me");
    });
    await shown("Hover me");
    await user.hover(toasts()[0] as HTMLElement);
    await new Promise((r) => setTimeout(r, 900));
    expect(has("Hover me")).toBe(true);
    await user.unhover(toasts()[0] as HTMLElement);
    await gone("Hover me");
  });

  it("pauses while focus is inside the region", async () => {
    const user = setupUser();
    renderUi(<Toaster duration={400} />);
    act(() => {
      toast("Focus me");
    });
    await shown("Focus me");
    const close = document.querySelector(
      "button[aria-label='Dismiss notification']",
    ) as HTMLElement;
    close.focus();
    await new Promise((r) => setTimeout(r, 900));
    expect(has("Focus me")).toBe(true);
    await user.click(document.body);
    close.blur();
    await gone("Focus me");
  });
});

describe("toast: dedupe, update, dismiss", () => {
  it("the same id shows one toast and updates it", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Saving 1", { id: "save" });
      toast("Saving 2", { id: "save" });
    });
    await shown("Saving 2");
    expect(toasts()).toHaveLength(1);
    expect(has("Saving 1")).toBe(false);
  });

  it("update changes a toast in place, including its type", async () => {
    renderUi(<Toaster />);
    let id = "";
    act(() => {
      id = toast.loading("Working");
    });
    await shown("Working");
    act(() => {
      toast.update(id, { title: "Done", type: "success", duration: 5000 });
    });
    await shown("Done");
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]?.getAttribute("data-type")).toBe("success");
  });

  it("updating the text of an error keeps it urgent", async () => {
    renderUi(<Toaster />);
    let id = "";
    act(() => {
      id = toast.error("Upload failed", { duration: 0 });
    });
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("Upload failed"),
    );
    act(() => {
      toast.update(id, { description: "Retrying in a moment" });
    });
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("Retrying in a moment"),
    );
  });

  it("changing the type of an update re-derives how urgent it is", async () => {
    renderUi(<Toaster />);
    let id = "";
    act(() => {
      id = toast.loading("Working");
    });
    await shown("Working");
    expect(document.querySelector("[role=alert]")).toBeNull();
    act(() => {
      toast.update(id, { title: "It failed", type: "error" });
    });
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("It failed"),
    );
  });

  it("dismiss(id) removes one toast", async () => {
    renderUi(<Toaster />);
    let keep = "";
    let drop = "";
    act(() => {
      keep = toast("Keep", { duration: 0 });
      drop = toast("Drop", { duration: 0 });
    });
    await shown("Drop");
    expect(keep).not.toBe(drop);
    act(() => toast.dismiss(drop));
    await gone("Drop");
    expect(has("Keep")).toBe(true);
  });

  it("dismiss() removes them all", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("A", { duration: 0 });
      toast("B", { duration: 0 });
    });
    await shown("B");
    act(() => toast.dismiss());
    await vi.waitFor(() => expect(toasts()).toHaveLength(0), { timeout: 3000 });
  });
});

describe("toast.promise", () => {
  it("shows loading, then success, and returns the promise's value", async () => {
    renderUi(<Toaster />);
    let resolve: (v: number) => void = () => {};
    const p = new Promise<number>((r) => {
      resolve = r;
    });
    let result: Promise<number> | undefined;
    act(() => {
      result = toast.promise(p, {
        loading: "Saving",
        success: (n) => `Saved ${n}`,
        error: "Failed",
      });
    });
    await shown("Saving");
    expect(toasts()[0]?.getAttribute("data-type")).toBe("loading");
    await act(async () => {
      resolve(7);
    });
    await shown("Saved 7");
    expect(toasts()[0]?.getAttribute("data-type")).toBe("success");
    await expect(result).resolves.toBe(7);
    expect(toasts()).toHaveLength(1);
  });

  it("announces a failed promise urgently", async () => {
    renderUi(<Toaster />);
    let result: Promise<unknown> | undefined;
    act(() => {
      result = toast.promise(Promise.reject(new Error("x")), {
        loading: "Saving",
        success: "Saved",
        error: "It failed",
      });
    });
    // Attach a handler now: the rejection happens before the assertions below get to it.
    const settled = result?.catch((error) => error);
    await vi.waitFor(() =>
      expect(document.querySelector("[role=alert]")?.textContent).toContain("It failed"),
    );
    expect(await settled).toEqual(new Error("x"));
  });

  it("shows an error toast on rejection and rejects with the same error", async () => {
    renderUi(<Toaster />);
    const boom = new Error("nope");
    let result: Promise<unknown> | undefined;
    act(() => {
      result = toast.promise(Promise.reject(boom), {
        loading: "Saving",
        success: "Saved",
        error: (e: Error) => `Failed: ${e.message}`,
      });
    });
    const settled = result?.catch((error) => error);
    await shown("Failed: nope");
    expect(toasts()[0]?.getAttribute("data-type")).toBe("error");
    expect(await settled).toBe(boom);
  });
});

describe("Toaster: stack, position and styling", () => {
  it("shows at most `limit` toasts at once; older ones are limited, not lost", async () => {
    renderUi(<Toaster limit={2} />);
    act(() => {
      toast("One", { duration: 0 });
      toast("Two", { duration: 0 });
      toast("Three", { duration: 0 });
    });
    await shown("Three");
    const limited = toasts().filter((t) => t.hasAttribute("data-limited"));
    expect(limited).toHaveLength(1);
    expect(limited[0]?.hasAttribute("inert") || limited[0]?.closest("[inert]") !== null).toBe(true);
  });

  it("shows three at a time by default", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("One", { duration: 0 });
      toast("Two", { duration: 0 });
      toast("Three", { duration: 0 });
      toast("Four", { duration: 0 });
    });
    await shown("Four");
    expect(toasts().filter((t) => t.hasAttribute("data-limited"))).toHaveLength(1);
  });

  it("defaults to the bottom right, above everything else (the toast layer)", () => {
    renderUi(<Toaster />);
    expect(classes(region())).toEqual(
      expect.arrayContaining(["fixed", "bottom-4", "right-4", "z-(--z-toast)"]),
    );
  });

  it.each([
    ["top-left", ["top-4", "left-4"]],
    ["top-center", ["top-4", "left-1/2", "-translate-x-1/2"]],
    ["top-right", ["top-4", "right-4"]],
    ["bottom-left", ["bottom-4", "left-4"]],
    ["bottom-center", ["bottom-4", "left-1/2", "-translate-x-1/2"]],
  ] as const)("position %s", (position, expected) => {
    renderUi(<Toaster position={position} />);
    expect(classes(region())).toEqual(expect.arrayContaining([...expected]));
  });

  it("is full width minus the gutters on small screens", () => {
    renderUi(<Toaster />);
    expect(classes(region())).toEqual(expect.arrayContaining(["w-[calc(100vw-2rem)]", "sm:w-96"]));
  });

  it("each toast is a token surface with elevation", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Surface");
    });
    await shown("Surface");
    expect(classes(toasts()[0] ?? null)).toEqual(
      expect.arrayContaining([
        "bg-popover",
        "text-popover-foreground",
        "border-border",
        "shadow-elevation-3",
        "rounded-lg",
      ]),
    );
  });

  it("moves and fades on the motion tokens, and follows the finger with no easing", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Motion");
    });
    await shown("Motion");
    expect(classes(toasts()[0] ?? null)).toEqual(
      expect.arrayContaining([
        "transition-[transform,opacity,height]",
        "duration-(--motion-duration-slow)",
        "data-[swiping]:transition-none",
        "data-[ending-style]:opacity-0",
      ]),
    );
  });

  it("collapsed toasts behind the front one hide their content until the stack expands", async () => {
    renderUi(<Toaster />);
    act(() => {
      toast("Behind", { duration: 0 });
    });
    await shown("Behind");
    const content = toasts()[0]?.querySelector("[data-toast-content]") as HTMLElement;
    expect(classes(content)).toEqual(
      expect.arrayContaining(["data-[behind]:opacity-0", "data-[expanded]:opacity-100"]),
    );
  });
});

describe("toast: accessibility", () => {
  it("passes axe with every type showing", async () => {
    renderUi(<Toaster limit={6} />);
    act(() => {
      toast("Plain", { duration: 0 });
      toast.success("Success", { description: "Done.", duration: 0 });
      toast.error("Error", { duration: 0 });
      toast.warning("Warning", { duration: 0 });
      toast.info("Info", { action: { label: "Open", onClick: () => {} }, duration: 0 });
      toast.loading("Loading");
    });
    await shown("Loading");
    await expectNoA11yViolations(document.body);
  });
});

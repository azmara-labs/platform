import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const menu = () => document.querySelector("[role=menu]") as HTMLElement | null;
const area = (container: HTMLElement) =>
  container.querySelector("[data-testid=area]") as HTMLElement;
const label = (el: Element | null) => el?.textContent?.replace(/\s+/g, " ").trim();
const items = () => Array.from(document.querySelectorAll("[role=menuitem]")) as HTMLElement[];

function Demo(props: { onCopy?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger data-testid="area" className="h-24 w-48">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={props.onCopy}>Copy</ContextMenuItem>
        <ContextMenuItem>Paste</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Show grid</ContextMenuCheckboxItem>
        <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("is closed until the secondary button is pressed", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    expect(menu()).toBeNull();
    await user.click(area(container));
    expect(menu()).toBeNull();
  });

  it("opens on right click as a menu", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    expect(items().map(label)).toEqual(["Copy", "Paste", "Delete"]);
  });

  it("suppresses the browser's own context menu", async () => {
    const { container } = renderUi(<Demo />);
    // dispatchEvent returns false when a handler called preventDefault.
    const notPrevented = area(container).dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    );
    expect(notPrevented).toBe(false);
    await vi.waitFor(() => expect(menu()).not.toBeNull());
  });

  it("opens from a contextmenu event (the keyboard Menu key and Shift+F10 raise one)", async () => {
    const { container } = renderUi(<Demo />);
    area(container).dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 30 }),
    );
    await vi.waitFor(() => expect(menu()).not.toBeNull());
  });

  it("runs an item once and closes", async () => {
    const user = setupUser();
    const onCopy = vi.fn();
    const { container } = renderUi(<Demo onCopy={onCopy} />);
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await user.click(items()[0] as HTMLElement);
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("supports the same keys as a dropdown: arrows, Home, End, typeahead and Escape", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    // A Base UI menu opens a moment before it handles keys, so press End again until focus lands
    // (pressing it twice is harmless).
    await vi.waitFor(
      async () => {
        await user.keyboard("{End}");
        expect(label(document.activeElement)).toBe("Delete");
      },
      { timeout: 4000 },
    );
    await user.keyboard("{Home}");
    expect(label(document.activeElement)).toBe("Copy");
    await user.keyboard("{ArrowDown}");
    expect(label(document.activeElement)).toBe("Paste");
    await user.keyboard("d");
    await vi.waitFor(() => expect(label(document.activeElement)).toBe("Delete"));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(menu()).toBeNull());
  });

  it("closes on an outside click", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Demo />
        <p data-testid="outside">Elsewhere</p>
      </div>,
    );
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await user.click(container.querySelector("[data-testid=outside]") as HTMLElement);
    await vi.waitFor(() => expect(menu()).toBeNull());
  });

  it("shares the dropdown's look: popover layer, token surface, destructive item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    expect(classes(menu()?.parentElement ?? null)).toContain("z-(--z-popover)");
    expect(classes(menu())).toEqual(
      expect.arrayContaining([
        "bg-popover",
        "shadow-elevation-3",
        "duration-(--motion-duration-fast)",
      ]),
    );
    expect(classes(items().find((i) => label(i) === "Delete") ?? null)).toContain(
      "text-destructive",
    );
    expect(document.querySelector("[role=menuitemcheckbox]")?.getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("passes axe open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.pointer({ keys: "[MouseRight]", target: area(container) });
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});

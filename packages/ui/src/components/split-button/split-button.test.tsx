import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { DropdownMenuItem } from "../menu/index.js";
import { SplitButton } from "./split-button.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const buttons = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
const menu = () => document.querySelector("[role=menu]") as HTMLElement | null;
const items = () => Array.from(document.querySelectorAll("[role=menuitem]")) as HTMLElement[];

function Demo(props: {
  onSave?: () => void;
  onAs?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline";
}) {
  return (
    <SplitButton
      menuLabel="More save options"
      onClick={props.onSave}
      loading={props.loading}
      disabled={props.disabled}
      variant={props.variant}
      menu={
        <>
          <DropdownMenuItem onClick={props.onAs}>Save as…</DropdownMenuItem>
          <DropdownMenuItem>Save a copy</DropdownMenuItem>
        </>
      }
    >
      Save
    </SplitButton>
  );
}

async function openMenu(user: ReturnType<typeof setupUser>, container: HTMLElement) {
  await user.click(buttons(container)[1] as HTMLElement);
  await vi.waitFor(() => expect(menu()).not.toBeNull());
}

describe("SplitButton", () => {
  it("is a primary action next to a menu trigger", () => {
    const { container } = renderUi(<Demo />);
    const [main, more] = buttons(container) as [HTMLButtonElement, HTMLButtonElement];
    expect(main.textContent).toBe("Save");
    expect(more.getAttribute("aria-label")).toBe("More save options");
    expect(more.getAttribute("aria-haspopup")).toBe("menu");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(more.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("requires a name for the menu trigger (the types enforce it)", () => {
    // @ts-expect-error the menu button has no text, so it needs a name
    const bad = <SplitButton menu={<DropdownMenuItem>x</DropdownMenuItem>}>Save</SplitButton>;
    expect(bad).toBeTruthy();
  });

  it("the main button runs onClick and does not open the menu", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Demo onSave={onSave} />);
    await user.click(buttons(container)[0] as HTMLElement);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it("the arrow button opens the menu with the extra actions", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await openMenu(user, container);
    expect(items().map((i) => i.textContent)).toEqual(["Save as…", "Save a copy"]);
    expect(buttons(container)[1]?.getAttribute("aria-expanded")).toBe("true");
  });

  it("the menu opens under the arrow button, aligned to its end", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await openMenu(user, container);
    expect(menu()?.getAttribute("data-side")).toBe("bottom");
    expect(menu()?.getAttribute("data-align")).toBe("end");
  });

  it("choosing a menu item runs it and closes the menu", async () => {
    const user = setupUser();
    const onAs = vi.fn();
    const { container } = renderUi(<Demo onAs={onAs} />);
    await openMenu(user, container);
    await user.click(items()[0] as HTMLElement);
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(onAs).toHaveBeenCalledTimes(1);
  });

  it("keyboard: Tab visits the main button then the arrow button; ArrowDown opens; Escape closes and returns focus", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    const [main, more] = buttons(container) as [HTMLButtonElement, HTMLButtonElement];
    await user.tab();
    expect(document.activeElement).toBe(main);
    await user.tab();
    expect(document.activeElement).toBe(more);
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await vi.waitFor(() => expect(document.activeElement).toBe(items()[0]));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(document.activeElement).toBe(more);
  });

  it("Enter on the main button runs the primary action", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<Demo onSave={onSave} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("disabled disables both parts", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Demo disabled onSave={onSave} />);
    const [main, more] = buttons(container) as [HTMLButtonElement, HTMLButtonElement];
    expect(main.hasAttribute("disabled") || main.getAttribute("aria-disabled") === "true").toBe(
      true,
    );
    expect(more.hasAttribute("disabled") || more.getAttribute("aria-disabled") === "true").toBe(
      true,
    );
    await user.click(main);
    await user.click(more);
    // A menu opens a moment after the press, so give it time before concluding it did not.
    await new Promise((r) => setTimeout(r, 150));
    expect(onSave).not.toHaveBeenCalled();
    expect(menu()).toBeNull();
  });

  it("the arrow button follows the size, so the pair stays level", () => {
    const { container } = renderUi(
      <SplitButton menuLabel="More" size="sm" menu={<DropdownMenuItem>x</DropdownMenuItem>}>
        Save
      </SplitButton>,
    );
    expect(classes(buttons(container)[0] ?? null)).toContain("h-8");
    expect(classes(buttons(container)[1] ?? null)).toContain("size-8");
  });

  it("loading shows a spinner on the main button, ignores it, and keeps the menu usable", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Demo loading onSave={onSave} />);
    const [main] = buttons(container) as [HTMLButtonElement];
    expect(main.getAttribute("aria-busy")).toBe("true");
    expect(main.querySelector("svg.animate-spin")).not.toBeNull();
    await user.click(main);
    expect(onSave).not.toHaveBeenCalled();
    await openMenu(user, container);
  });

  it("the two buttons are joined and separated by a divider", () => {
    const { container } = renderUi(<Demo />);
    const group = container.firstElementChild as HTMLElement;
    expect(classes(group)).toEqual(
      expect.arrayContaining([
        "inline-flex",
        "[&>*:not(:first-child)]:rounded-l-none",
        "[&>*:not(:last-child)]:rounded-r-none",
      ]),
    );
    expect(classes(buttons(container)[1] ?? null)).toContain("border-l");
  });

  it("an outline split button keeps one shared border (no doubled divider)", () => {
    const { container } = renderUi(<Demo variant="outline" />);
    expect(classes(buttons(container)[1] ?? null)).toContain("border-input");
  });

  it("passes axe closed and open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await expectNoA11yViolations(container);
    await openMenu(user, container);
    await expectNoA11yViolations(document.body);
  });
});

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const menus = () => Array.from(document.querySelectorAll("[role=menu]")) as HTMLElement[];
const menu = () => menus()[0] ?? null;
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;
const items = (root: ParentNode = document) =>
  Array.from(root.querySelectorAll("[role=menuitem]")) as HTMLElement[];
const label = (el: Element | null) => el?.textContent?.replace(/\s+/g, " ").trim();
const focused = () => label(document.activeElement);

// A Base UI menu opens a moment after the press, so wait for it.
async function open(user: ReturnType<typeof setupUser>, container: HTMLElement) {
  await user.click(trigger(container));
  await vi.waitFor(() => expect(menu()).not.toBeNull());
}

// Home, then down to the "Share" sub trigger, waiting for each move: rapid keys can outrun Base UI's
// focus handling when the whole suite is running.
async function focusShare(user: ReturnType<typeof setupUser>) {
  // On a slow machine the first key can arrive before the menu has taken focus, so press Home until it lands.
  await vi.waitFor(
    async () => {
      await user.keyboard("{Home}");
      expect(focused()).toBe("New");
    },
    { timeout: 4000 },
  );
  await user.keyboard("{ArrowDown}");
  await vi.waitFor(() => expect(focused()).toBe("Share"), { timeout: 4000 });
}

function Basic(props: { onSave?: () => void; onDelete?: () => void; closeOnClickKeep?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={props.onSave}>
          Save <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuItem closeOnClick={props.closeOnClickKeep ? false : undefined}>
          Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={props.onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu: opening", () => {
  it("is closed by default; the trigger announces a menu", () => {
    const { container } = renderUi(<Basic />);
    expect(menu()).toBeNull();
    expect(trigger(container).getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on click as a menu of menu items", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(menu()).not.toBeNull();
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    expect(items().map(label)).toEqual(["Save ⌘S", "Rename", "Archive", "Copy link", "Delete"]);
  });

  it("opens from the keyboard with Enter, Space and ArrowDown, landing on the first item", async () => {
    for (const key of ["{Enter}", " ", "{ArrowDown}"]) {
      const user = setupUser();
      const { container, unmount } = renderUi(<Basic />);
      await user.tab();
      expect(document.activeElement).toBe(trigger(container));
      await user.keyboard(key);
      await vi.waitFor(() => expect(menu()).not.toBeNull());
      await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
      await user.keyboard("{Escape}");
      await vi.waitFor(() => expect(menu()).toBeNull());
      unmount();
    }
  });

  it("opens with ArrowUp, landing on the last item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await user.tab();
    await user.keyboard("{ArrowUp}");
    await vi.waitFor(() => expect(focused()).toBe("Delete"));
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: boolean[] = [];
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            seen.push(next);
            setOpen(next);
          }}
        >
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>One</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    const { container } = renderUi(<Controlled />);
    await open(user, container);
    expect(seen).toEqual([true]);
    expect(menu()).not.toBeNull();
  });
});

describe("DropdownMenu: keyboard map", () => {
  it("ArrowDown and ArrowUp move between items and wrap; a disabled item stays focusable", async () => {
    // The WAI-ARIA menu pattern keeps disabled items focusable so people can find them. They are
    // announced as disabled and cannot be activated.
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    await user.keyboard("{Home}");
    await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Rename"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Archive"));
    expect(document.activeElement?.getAttribute("aria-disabled")).toBe("true");
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Copy link"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Delete"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Save ⌘S")); // wraps
    await user.keyboard("{ArrowUp}");
    await vi.waitFor(() => expect(focused()).toBe("Delete")); // wraps back
  });

  it("Home and End jump to the first and last enabled item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    await user.keyboard("{End}");
    await vi.waitFor(() => expect(focused()).toBe("Delete"));
    await user.keyboard("{Home}");
    expect(focused()).toBe("Save ⌘S");
  });

  it("typeahead jumps to the item that starts with the typed letters", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    await user.keyboard("{Home}");
    await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
    await user.keyboard("d");
    await vi.waitFor(() => expect(focused()).toBe("Delete"));
  });

  it("typeahead matches several letters typed together", async () => {
    // Letters typed in quick succession form one search ("co"), not one search each.
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    await user.keyboard("{Home}");
    await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
    await user.keyboard("co");
    await vi.waitFor(() => expect(focused()).toBe("Copy link"));
  });

  it("Enter and Space activate the focused item once and close the menu", async () => {
    for (const key of ["{Enter}", " "]) {
      const user = setupUser();
      const onSave = vi.fn();
      const { container, unmount } = renderUi(<Basic onSave={onSave} />);
      await open(user, container);
      await user.keyboard("{Home}");
      await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
      await user.keyboard(key);
      await vi.waitFor(() => expect(menu()).toBeNull());
      expect(onSave).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it("Escape closes the menu and returns focus to the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(document.activeElement).toBe(trigger(container));
  });

  it("Tab closes the menu without trapping focus", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Basic />
        <button type="button">After</button>
      </div>,
    );
    await open(user, container);
    await user.keyboard("{ArrowDown}");
    await user.tab();
    await vi.waitFor(() => expect(menu()).toBeNull());
  });

  it("a click outside closes it", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Basic />
        <p data-testid="outside">Elsewhere</p>
      </div>,
    );
    await open(user, container);
    await user.click(container.querySelector("[data-testid=outside]") as HTMLElement);
    await vi.waitFor(() => expect(menu()).toBeNull());
  });
});

describe("DropdownMenu: items", () => {
  it("clicking an item runs it once and closes the menu", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Basic onSave={onSave} />);
    await open(user, container);
    await user.click(items()[0] as HTMLElement);
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("a disabled item is announced as disabled and does nothing", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    const archive = items().find((i) => label(i) === "Archive") as HTMLElement;
    expect(archive.getAttribute("aria-disabled")).toBe("true");
    await user.click(archive);
    expect(menu()).not.toBeNull();
  });

  it("Enter on a focused disabled item does nothing", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Basic onSave={onSave} />);
    await open(user, container);
    await user.keyboard("{Home}");
    await vi.waitFor(() => expect(focused()).toBe("Save ⌘S"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Rename"));
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Archive"));
    await user.keyboard("{Enter}");
    await new Promise((r) => setTimeout(r, 50));
    expect(menu()).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closeOnClick={false} keeps the menu open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic closeOnClickKeep />);
    await open(user, container);
    await user.click(items().find((i) => label(i) === "Copy link") as HTMLElement);
    await new Promise((r) => setTimeout(r, 50));
    expect(menu()).not.toBeNull();
  });

  it("styles a destructive item in the destructive colour, away from the neutral ones", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    const del = items().find((i) => label(i) === "Delete") as HTMLElement;
    expect(classes(del)).toEqual(
      expect.arrayContaining(["text-destructive", "data-[highlighted]:bg-destructive/10"]),
    );
    const rename = items().find((i) => label(i) === "Rename") as HTMLElement;
    expect(classes(rename)).not.toContain("text-destructive");
  });

  it("shows the shortcut at the end of the item, as muted text", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    const shortcut = document.querySelector("[data-azmr-shortcut]") as HTMLElement;
    expect(shortcut.textContent).toBe("⌘S");
    expect(classes(shortcut)).toEqual(
      expect.arrayContaining(["ml-auto", "text-xs", "text-muted-foreground"]),
    );
  });

  it("highlights the active item from tokens and has no focus outline fighting it", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(classes(items()[1] ?? null)).toEqual(
      expect.arrayContaining([
        "data-[highlighted]:bg-accent",
        "data-[highlighted]:text-accent-foreground",
        "outline-none",
        "data-[disabled]:opacity-50",
        "data-[disabled]:pointer-events-none",
        "duration-(--motion-duration-fast)",
      ]),
    );
  });

  it("a link item is a real link in the menu", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <DropdownMenu>
        <DropdownMenuTrigger>Go</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLinkItem href="/projects">Projects</DropdownMenuLinkItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await open(user, container);
    const link = document.querySelector("a[href='/projects']") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute("role")).toBe("menuitem");
  });
});

describe("DropdownMenu: checkbox and radio items", () => {
  function Options(props: { onChange?: (v: boolean) => void; onTheme?: (v: string) => void }) {
    const [bold, setBold] = useState(false);
    const [theme, setTheme] = useState("light");
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>View</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={bold}
            onCheckedChange={(v) => {
              setBold(v);
              props.onChange?.(v);
            }}
          >
            Bold
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(v) => {
              setTheme(v as string);
              props.onTheme?.(v as string);
            }}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const role = (r: string) => Array.from(document.querySelectorAll(`[role=${r}]`)) as HTMLElement[];

  it("checkbox items expose checked state and toggle without closing the menu", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    const { container } = renderUi(<Options onChange={onChange} />);
    await open(user, container);
    const bold = role("menuitemcheckbox")[0] as HTMLElement;
    expect(bold.getAttribute("aria-checked")).toBe("false");
    expect(bold.querySelector("svg")).toBeNull();
    await user.click(bold);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(bold.getAttribute("aria-checked")).toBe("true");
    expect(bold.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(menu()).not.toBeNull();
  });

  it("checkbox items toggle with Space and Enter from the keyboard", async () => {
    const user = setupUser();
    const { container } = renderUi(<Options />);
    await open(user, container);
    await user.keyboard("{Home}");
    await vi.waitFor(() => expect(focused()).toBe("Bold"));
    await user.keyboard(" ");
    await vi.waitFor(() =>
      expect(role("menuitemcheckbox")[0]?.getAttribute("aria-checked")).toBe("true"),
    );
  });

  it("radio items select exactly one", async () => {
    const user = setupUser();
    const onTheme = vi.fn();
    const { container } = renderUi(<Options onTheme={onTheme} />);
    await open(user, container);
    const [light, dark] = role("menuitemradio") as [HTMLElement, HTMLElement];
    expect(light.getAttribute("aria-checked")).toBe("true");
    expect(dark.getAttribute("aria-checked")).toBe("false");
    await user.click(dark);
    expect(onTheme).toHaveBeenCalledWith("dark");
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(light.getAttribute("aria-checked")).toBe("false");
  });

  it("the indicator is only drawn on the selected radio item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Options />);
    await open(user, container);
    const [light, dark] = role("menuitemradio") as [HTMLElement, HTMLElement];
    expect(light.querySelector("svg")).not.toBeNull();
    expect(dark.querySelector("svg")).toBeNull();
  });

  it("checkable items leave room for the indicator", async () => {
    const user = setupUser();
    const { container } = renderUi(<Options />);
    await open(user, container);
    expect(classes(role("menuitemcheckbox")[0] ?? null)).toContain("pl-8");
    expect(classes(role("menuitemradio")[0] ?? null)).toContain("pl-8");
  });
});

describe("DropdownMenu: groups, labels and separators", () => {
  it("a labelled group is a named group of items, and the separator is a separator", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <DropdownMenu>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Signed in as Aroha</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await open(user, container);
    const group = document.querySelector("[role=group]") as HTMLElement;
    expect(group).not.toBeNull();
    expect(
      document.getElementById(group.getAttribute("aria-labelledby") as string)?.textContent,
    ).toBe("Signed in as Aroha");
    expect(document.querySelector("[role=separator]")).not.toBeNull();
    expect(classes(document.querySelector("[role=separator]"))).toEqual(
      expect.arrayContaining(["h-px", "bg-border"]),
    );
    const labelEl = document.getElementById(group.getAttribute("aria-labelledby") as string);
    expect(classes(labelEl)).toEqual(
      expect.arrayContaining(["text-xs", "font-medium", "text-muted-foreground"]),
    );
    // The label is not a menu item, so arrow keys skip it.
    expect(items().map(label)).toEqual(["Profile", "Sign out"]);
  });
});

describe("DropdownMenu: submenus", () => {
  function WithSub() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>File</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>New</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem>Close</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("the sub trigger is a menu item that announces a submenu", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    const sub = items().find((i) => label(i) === "Share") as HTMLElement;
    expect(sub.getAttribute("aria-haspopup")).toBe("menu");
    expect(sub.getAttribute("aria-expanded")).toBe("false");
    expect(sub.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("ArrowRight opens the submenu and moves focus into it; ArrowLeft closes it and returns", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await user.keyboard("{Home}");
    await user.keyboard("{ArrowDown}");
    await vi.waitFor(() => expect(focused()).toBe("Share"));
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
    await vi.waitFor(() => expect(focused()).toBe("Email"));
    await user.keyboard("{ArrowDown}");
    expect(focused()).toBe("Copy link");
    await user.keyboard("{ArrowLeft}");
    await vi.waitFor(() => expect(menus()).toHaveLength(1));
    await vi.waitFor(() => expect(focused()).toBe("Share"));
  });

  it("Enter on the sub trigger also opens it", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await focusShare(user);
    await vi.waitFor(() => expect(focused()).toBe("Share"));
    await user.keyboard("{Enter}");
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
  });

  it("Escape closes the submenu first, then the menu", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await focusShare(user);
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(menus().length).toBeLessThanOrEqual(1));
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect(document.activeElement).toBe(trigger(container));
  });

  it("choosing an item in the submenu closes everything", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await focusShare(user);
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(focused()).toBe("Email"));
    await user.keyboard("{Enter}");
    await vi.waitFor(() => expect(menus()).toHaveLength(0));
  });

  it("the submenu opens beside its parent, not below it", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await focusShare(user);
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
    const sub = menus().find((m) => m !== menus()[0]) ?? menus()[1];
    expect(["right", "inline-end"]).toContain(sub?.getAttribute("data-side"));
    expect(sub?.getAttribute("data-align")).toBe("start");
  });

  it("the submenu is on the popover layer too, so it stays above its parent", async () => {
    const user = setupUser();
    const { container } = renderUi(<WithSub />);
    await open(user, container);
    await focusShare(user);
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
    for (const m of menus()) expect(classes(m.parentElement)).toContain("z-(--z-popover)");
  });
});

describe("DropdownMenu: structure and styling", () => {
  it("renders in a portal on the popover layer with a token surface and elevation", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(container.contains(menu())).toBe(false);
    expect(classes(menu()?.parentElement ?? null)).toContain("z-(--z-popover)");
    expect(classes(menu())).toEqual(
      expect.arrayContaining([
        "bg-popover",
        "text-popover-foreground",
        "border-border",
        "shadow-elevation-3",
        "rounded-md",
        "p-1",
        "outline-none",
      ]),
    );
  });

  it("caps its height to the space available and scrolls inside", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(classes(menu())).toEqual(
      expect.arrayContaining(["max-h-(--available-height)", "overflow-y-auto"]),
    );
  });

  it("animates with the motion tokens from the trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(classes(menu())).toEqual(
      expect.arrayContaining([
        "origin-(--transform-origin)",
        "transition-[opacity,scale]",
        "duration-(--motion-duration-fast)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[starting-style]:scale-95",
        "data-[ending-style]:scale-95",
      ]),
    );
  });

  it("opens below and start-aligned by default", async () => {
    const user = setupUser();
    const { container } = renderUi(<Basic />);
    await open(user, container);
    expect(menu()?.getAttribute("data-side")).toBe("bottom");
    expect(menu()?.getAttribute("data-align")).toBe("start");
  });
});

describe("DropdownMenu: accessibility", () => {
  it("passes axe closed, open, with every item kind, and with a submenu open", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <DropdownMenu>
        <DropdownMenuTrigger>Everything</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Group</DropdownMenuLabel>
            <DropdownMenuItem>Plain</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Destructive</DropdownMenuItem>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Check</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await expectNoA11yViolations(document.body);
    await open(user, container);
    await vi.waitFor(() => expect(menu()).not.toBeNull());
    await expectNoA11yViolations(document.body);
    await user.keyboard("{End}{ArrowRight}"); // the last item is the sub trigger
    await vi.waitFor(() => expect(menus()).toHaveLength(2));
    await expectNoA11yViolations(document.body);
  });
});

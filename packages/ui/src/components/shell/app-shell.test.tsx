import { act, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  firePointer,
  type MatchMediaMock,
  mockMatchMedia,
  renderUi,
  setupUser,
} from "../../test-utils/index.js";
import {
  AppShell,
  type AppShellProps,
  NavGroup,
  NavItem,
  Sidebar,
  SidebarFooter,
  useAppShell,
} from "./index.js";

const DESKTOP = "(min-width: 64rem)";

let shell: ReturnType<typeof useAppShell>;
function Capture() {
  shell = useAppShell();
  return null;
}

let setMenuOpen: (open: boolean) => void = () => {};
function Footer() {
  const [open, set] = useState(false);
  setMenuOpen = set;
  return (
    <SidebarFooter>
      <button type="button" aria-expanded={open}>
        Account
      </button>
    </SidebarFooter>
  );
}

function Demo(props: Partial<AppShellProps>) {
  return (
    <AppShell
      topBar={
        <AppShell.TopBar
          brand={<span>Brand</span>}
          start={<input aria-label="Search" />}
          end={<span>End</span>}
        />
      }
      sidebar={
        <Sidebar label="Main">
          <NavGroup title="Orders">
            <NavItem href="#home" current>
              Home
            </NavItem>
            <NavItem href="#orders">My orders</NavItem>
          </NavGroup>
          <Footer />
        </Sidebar>
      }
      {...props}
    >
      <p>Content</p>
      <Capture />
    </AppShell>
  );
}

const clearCookie = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of the cookie the shell writes
  document.cookie = "azmr-sidebar=; Max-Age=0; Path=/";
};

let media: MatchMediaMock;
const desktop = () => {
  media = mockMatchMedia({ [DESKTOP]: true });
};
const mobile = () => {
  media = mockMatchMedia({ [DESKTOP]: false });
};

beforeEach(clearCookie);
afterEach(() => {
  media?.restore();
  clearCookie();
});

const pick = (container: HTMLElement) => ({
  root: container.querySelector("[data-azmr-shell]") as HTMLElement,
  aside: container.querySelector("aside") as HTMLElement,
  toggle: container.querySelector("button[data-shell-toggle]") as HTMLButtonElement,
  main: container.querySelector("main") as HTMLElement,
  zone: container.querySelector("[data-peek-zone]") as HTMLElement | null,
  link: (name: string) =>
    Array.from(container.querySelectorAll("a")).find((a) => a.textContent === name) as HTMLElement,
});

describe("AppShell structure", () => {
  it("has a banner, a named navigation and exactly one main", () => {
    desktop();
    const { container } = renderUi(<Demo />);
    expect(container.querySelectorAll("header").length).toBe(1);
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Main");
    expect(container.querySelectorAll("main").length).toBe(1);
  });

  it("makes the skip link the first stop and moves focus to main", async () => {
    desktop();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    const skip = document.activeElement as HTMLElement;
    expect(skip.tagName).toBe("A");
    expect(skip.textContent).toBe("Skip to content");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(pick(container).main);
  });

  it("uses translated labels when given", () => {
    desktop();
    const { container } = renderUi(
      <Demo labels={{ skipLink: "Aller au contenu", openNav: "Ouvrir", closeNav: "Fermer" }} />,
    );
    expect(container.textContent).toContain("Aller au contenu");
    expect(pick(container).toggle.getAttribute("aria-label")).toBe("Fermer");
  });

  it("shows the top bar's start slot only from md up", () => {
    desktop();
    const { container } = renderUi(<Demo />);
    const start = container.querySelector("[data-topbar-start]");
    const names = (start?.getAttribute("class") ?? "").split(/\s+/);
    expect(names).toContain("hidden");
    expect(names).toContain("md:block");
  });

  it("works without a sidebar or a top bar", () => {
    desktop();
    const { container } = renderUi(
      <AppShell>
        <p>Only content</p>
      </AppShell>,
    );
    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector("main")?.textContent).toBe("Only content");
  });

  it("throws a clear error when useAppShell is used outside AppShell", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderUi(<Capture />)).toThrow(/AppShell/);
    errors.mockRestore();
  });
});

describe("desktop modes", () => {
  it("renders hidden: the sidebar is inert and takes no layout space", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, aside } = pick(container);
    expect(root.getAttribute("data-sidebar")).toBe("hidden");
    expect(aside.hasAttribute("inert")).toBe(true);
  });

  it("renders pinned: the sidebar is not inert", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="pinned" />);
    const { root, aside } = pick(container);
    expect(root.getAttribute("data-sidebar")).toBe("pinned");
    expect(aside.hasAttribute("inert")).toBe(false);
  });

  it("pins and unpins with the toggle, and remembers the choice in a cookie", async () => {
    desktop();
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, toggle, aside } = pick(container);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(root.getAttribute("data-sidebar")).toBe("pinned");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(aside.hasAttribute("inert")).toBe(false);
    expect(document.cookie).toContain("azmr-sidebar=pinned");
    await user.click(toggle);
    expect(root.getAttribute("data-sidebar")).toBe("hidden");
    expect(document.cookie).toContain("azmr-sidebar=hidden");
    expect(document.activeElement).toBe(toggle);
  });

  it("writes no cookie when persist is off", async () => {
    desktop();
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" persist={false} />);
    await user.click(pick(container).toggle);
    expect(document.cookie).not.toContain("azmr-sidebar");
  });

  it("returns focus to the toggle when the sidebar hides while focus is inside it", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="pinned" />);
    const { toggle, link } = pick(container);
    act(() => link("My orders").focus());
    expect(document.activeElement).toBe(link("My orders"));
    act(() => shell.setMode("hidden"));
    expect(document.activeElement).toBe(toggle);
  });

  it("exposes its state through useAppShell", () => {
    desktop();
    renderUi(<Demo defaultMode="hidden" />);
    expect(shell.mode).toBe("hidden");
    expect(shell.isDesktop).toBe(true);
    expect(shell.peeking).toBe(false);
    expect(shell.drawerOpen).toBe(false);
  });
});

describe("keyboard", () => {
  it("reaches the toggle by Tab, and Enter pins the sidebar and makes its links reachable", async () => {
    desktop();
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { toggle, aside, link } = pick(container);
    await user.tab(); // skip link
    await user.tab(); // the toggle comes first in the top bar, before the search field
    expect(document.activeElement).toBe(toggle);
    expect(aside.hasAttribute("inert")).toBe(true);
    await user.keyboard("{Enter}");
    expect(aside.hasAttribute("inert")).toBe(false);
    await user.tab(); // the search field, last in the top bar
    await user.tab(); // the sidebar's scroll region, focusable so a keyboard can scroll it
    expect(document.activeElement?.getAttribute("role")).toBe("region");
    await user.tab();
    expect(document.activeElement).toBe(link("Home"));
  });
});

describe("peek", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("slides the hidden sidebar over the content after the pointer rests on the edge", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, aside, zone } = pick(container);
    expect(zone).not.toBeNull();
    firePointer("pointerover", zone as HTMLElement);
    tick(119);
    expect(aside.hasAttribute("inert")).toBe(true);
    tick(1);
    expect(aside.hasAttribute("inert")).toBe(false);
    expect(root.getAttribute("data-peek")).toBe("open");
    expect(root.getAttribute("data-sidebar")).toBe("hidden"); // layout unchanged: nothing shifts
    expect(shell.peeking).toBe(true);
  });

  it("closes after the pointer leaves, and on Escape", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, aside, zone } = pick(container);
    firePointer("pointerover", zone as HTMLElement, {});
    tick(120);
    firePointer("pointerout", zone as HTMLElement, { related: aside });
    firePointer("pointerover", aside, { related: zone });
    firePointer("pointerout", aside);
    tick(250);
    expect(root.getAttribute("data-peek")).toBe("closed");

    firePointer("pointerover", zone as HTMLElement);
    tick(120);
    expect(root.getAttribute("data-peek")).toBe("open");
    act(() => {
      aside.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(root.getAttribute("data-peek")).toBe("closed");
  });

  it("does not peek for a touch or pen pointer", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, zone } = pick(container);
    firePointer("pointerover", zone as HTMLElement, { pointerType: "touch" });
    tick(1000);
    expect(root.getAttribute("data-peek")).toBe("closed");
  });

  it("stays open while a menu opened from the sidebar is expanded", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, aside, zone } = pick(container);
    firePointer("pointerover", zone as HTMLElement);
    tick(120);
    firePointer("pointerover", aside);
    act(() => setMenuOpen(true));
    firePointer("pointerout", aside); // the pointer moves into the menu's popover
    tick(2000);
    expect(root.getAttribute("data-peek")).toBe("open");
    act(() => setMenuOpen(false));
    tick(250);
    expect(root.getAttribute("data-peek")).toBe("closed");
  });

  it("closes when a link in the peeking sidebar is clicked", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { root, zone, link } = pick(container);
    firePointer("pointerover", zone as HTMLElement);
    tick(120);
    expect(root.getAttribute("data-peek")).toBe("open");
    act(() => link("My orders").click());
    expect(root.getAttribute("data-peek")).toBe("closed");
  });

  it("has no peek and no edge zone while pinned", () => {
    desktop();
    const { container } = renderUi(<Demo defaultMode="pinned" />);
    const { root, zone } = pick(container);
    expect(zone).toBeNull();
    expect(root.getAttribute("data-peek")).toBe("closed");
  });
});

describe("below the breakpoint", () => {
  it("has no edge zone, and the toggle drives the drawer state instead of pinning", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const { toggle, zone } = pick(container);
    expect(zone).toBeNull();
    expect(toggle.hasAttribute("aria-controls")).toBe(false);
    await user.click(toggle);
    expect(shell.drawerOpen).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(shell.mode).toBe("hidden"); // the remembered desktop choice is untouched
  });
});

describe("hydration", () => {
  it("hydrates server markup (hidden and pinned) with no warnings", async () => {
    for (const defaultMode of ["hidden", "pinned"] as const) {
      desktop();
      const container = document.createElement("div");
      document.body.appendChild(container);
      container.innerHTML = renderToString(<Demo defaultMode={defaultMode} />);
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, <Demo defaultMode={defaultMode} />);
      });
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
      act(() => root?.unmount());
      container.remove();
      media.restore();
    }
  });
});

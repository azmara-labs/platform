import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectNoA11yViolations,
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

function Demo(props: Partial<AppShellProps>) {
  return (
    <AppShell
      topBar={<AppShell.TopBar brand={<span>Brand</span>} />}
      sidebar={
        <Sidebar label="Main">
          <NavGroup title="Orders">
            <NavItem href="#home" current>
              Home
            </NavItem>
            <NavItem href="#orders">My orders</NavItem>
          </NavGroup>
          <SidebarFooter>
            <button type="button">Account</button>
          </SidebarFooter>
        </Sidebar>
      }
      {...props}
    >
      <p>Content</p>
      <Capture />
    </AppShell>
  );
}

let media: MatchMediaMock;
afterEach(() => media?.restore());
const mobile = () => {
  media = mockMatchMedia({ [DESKTOP]: false });
};

const dialog = () => document.querySelector("[role=dialog]") as HTMLElement | null;
const toggleOf = (container: HTMLElement) =>
  container.querySelector("button[data-shell-toggle]") as HTMLButtonElement;

describe("the navigation drawer below the breakpoint", () => {
  it("opens as a modal dialog named by labels.drawerTitle, holding the sidebar", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    expect(dialog()).toBeNull();
    await user.click(toggleOf(container));
    const d = dialog() as HTMLElement;
    expect(d).not.toBeNull();
    expect(document.getElementById(d.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Navigation",
    );
    expect(d.querySelector("nav")?.getAttribute("aria-label")).toBe("Main");
    expect(d.textContent).toContain("Account"); // the footer comes with it
  });

  it("uses a translated title", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo labels={{ drawerTitle: "Navigation principale" }} />);
    await user.click(toggleOf(container));
    const d = dialog() as HTMLElement;
    expect(document.getElementById(d.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Navigation principale",
    );
  });

  it("moves focus into the drawer and keeps it there while tabbing", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(toggleOf(container));
    const d = dialog() as HTMLElement;
    // Base UI redirects focus back inside from its guard elements a moment after Tab, so wait for it.
    await vi.waitFor(() => expect(d.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 6; i++) {
      await user.tab();
      await vi.waitFor(() =>
        expect(d.contains(document.activeElement), `Tab #${i + 1}`).toBe(true),
      );
    }
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    const toggle = toggleOf(container);
    await user.click(toggle);
    expect(dialog()).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it("returns focus to the toggle even when the drawer was opened from code", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    // Focus is on the page, not the toggle, so there is no "previous element" to return to.
    act(() => shell.setDrawerOpen(true));
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    await user.keyboard("{Escape}");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(toggleOf(container));
  });

  it("closes when a nav link is clicked", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(toggleOf(container));
    const link = Array.from((dialog() as HTMLElement).querySelectorAll("a")).find(
      (a) => a.textContent === "My orders",
    ) as HTMLElement;
    await user.click(link);
    expect(dialog()).toBeNull();
    expect(shell.drawerOpen).toBe(false);
  });

  it("closes on a click on the scrim", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(toggleOf(container));
    expect(dialog()).not.toBeNull();
    await user.click(document.querySelector("[data-azmr-backdrop]") as HTMLElement);
    expect(dialog()).toBeNull();
  });

  it("keeps the toggle's aria-expanded in step with the drawer", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    const toggle = toggleOf(container);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Escape}");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides the page behind the open drawer from assistive technology", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(toggleOf(container));
    const aside = container.querySelector("[data-peek-panel]") as HTMLElement;
    expect(aside.closest("[inert], [aria-hidden=true]")).not.toBeNull();
    expect(container.querySelector("main")?.closest("[inert], [aria-hidden=true]")).not.toBeNull();
  });

  it("closes when the window grows past the breakpoint, returns focus, and keeps the mode", async () => {
    mobile();
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const toggle = toggleOf(container);
    await user.click(toggle);
    expect(dialog()).not.toBeNull();
    act(() => media.set(DESKTOP, true));
    expect(dialog()).toBeNull();
    expect(shell.drawerOpen).toBe(false);
    expect(shell.mode).toBe("hidden");
    expect(document.activeElement).toBe(toggle);
    // Shrinking again does not reopen it.
    act(() => media.set(DESKTOP, false));
    expect(dialog()).toBeNull();
  });

  it("does not open on desktop: the toggle pins instead", async () => {
    media = mockMatchMedia({ [DESKTOP]: true });
    const user = setupUser();
    const { container } = renderUi(<Demo defaultMode="hidden" />);
    const toggle = toggleOf(container);
    expect(shell.mode).toBe("hidden");
    await user.click(toggle);
    expect(dialog()).toBeNull();
    expect(shell.mode).toBe("pinned");
  });

  it.each(["light", "dark"])("passes axe with the drawer open in %s", async (theme) => {
    mobile();
    document.documentElement.setAttribute("data-theme", theme);
    try {
      const user = setupUser();
      const { container } = renderUi(<Demo />);
      await user.click(toggleOf(container));
      expect(dialog()).not.toBeNull();
      await expectNoA11yViolations(document.body);
    } finally {
      document.documentElement.removeAttribute("data-theme");
    }
  });
});

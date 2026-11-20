import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectNoA11yViolations,
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
} from "./index.js";

const DESKTOP = "(min-width: 64rem)";
let media: MatchMediaMock;
afterEach(() => {
  media?.restore();
  document.documentElement.removeAttribute("data-theme");
});

function Demo(props: Partial<AppShellProps>) {
  return (
    <AppShell
      topBar={
        <AppShell.TopBar
          brand={<span>Brand</span>}
          start={<input aria-label="Search" />}
          end={<button type="button">Account</button>}
        />
      }
      sidebar={
        <Sidebar label="Main">
          <NavGroup title="Orders">
            <NavItem href="#home" current icon={<svg aria-hidden="true" />}>
              Home
            </NavItem>
            <NavItem href="#orders" badge={3}>
              My orders
            </NavItem>
          </NavGroup>
          <SidebarFooter>
            <button type="button">Sign out</button>
          </SidebarFooter>
        </Sidebar>
      }
      {...props}
    >
      <h1>Page</h1>
    </AppShell>
  );
}

const themes = ["light", "dark"] as const;
const setTheme = (theme: (typeof themes)[number]) =>
  document.documentElement.setAttribute("data-theme", theme);

describe("AppShell accessibility", () => {
  describe.each(themes)("in %s", (theme) => {
    it("passes axe pinned", async () => {
      media = mockMatchMedia({ [DESKTOP]: true });
      setTheme(theme);
      const { container } = renderUi(<Demo defaultMode="pinned" />);
      await expectNoA11yViolations(container);
    });

    it("passes axe hidden", async () => {
      media = mockMatchMedia({ [DESKTOP]: true });
      setTheme(theme);
      const { container } = renderUi(<Demo defaultMode="hidden" />);
      await expectNoA11yViolations(container);
    });

    it("passes axe while peeking", async () => {
      media = mockMatchMedia({ [DESKTOP]: true });
      setTheme(theme);
      const { container } = renderUi(<Demo defaultMode="hidden" />);
      firePointer("pointerover", container.querySelector("[data-peek-zone]") as Element);
      await vi.waitFor(() =>
        expect(container.querySelector("[data-azmr-shell]")?.getAttribute("data-peek")).toBe(
          "open",
        ),
      );
      await expectNoA11yViolations(container);
    });
  });
});

describe("reduced motion", () => {
  it("takes every duration in the shell from the motion tokens, which collapse under prefers-reduced-motion", () => {
    const dir = import.meta.dirname;
    const files = readdirSync(dir).filter(
      (name) => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name),
    );
    expect(files.length).toBeGreaterThan(5);
    const hardCoded: string[] = [];
    for (const name of files) {
      const source = readFileSync(join(dir, name), "utf8");
      for (const match of source.matchAll(/\b(?:[a-z]+:)*duration-([^\s"'`]+)/g)) {
        if (!match[1]?.startsWith("(--motion-duration-")) hardCoded.push(`${name}: ${match[0]}`);
      }
      if (/\banimate-(?!\[)/.test(source)) hardCoded.push(`${name}: animate-* utility`);
    }
    expect(hardCoded).toEqual([]);
  });
});

describe("the shell leaves the page as it found it", () => {
  it("restores everything outside itself after the drawer has been opened and the shell unmounted", async () => {
    media = mockMatchMedia({ [DESKTOP]: false });
    const sibling = document.createElement("div");
    sibling.id = "sibling";
    sibling.className = "keep";
    document.body.appendChild(sibling);
    const before = {
      body: document.body.style.cssText,
      html: document.documentElement.style.cssText,
      sibling: sibling.outerHTML,
    };

    const user = setupUser();
    const { container, unmount } = renderUi(<Demo />);
    await user.click(container.querySelector("button[data-shell-toggle]") as HTMLElement);
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    unmount();
    await vi.waitFor(() => expect(document.querySelector("[role=dialog]")).toBeNull());

    // Base UI releases its scroll lock a moment after the dialog goes, so wait for it.
    await vi.waitFor(() => {
      expect(document.body.style.cssText).toBe(before.body);
      expect(document.documentElement.style.cssText).toBe(before.html);
    });
    expect(sibling.outerHTML).toBe(before.sibling);
    expect(document.querySelectorAll("[inert]").length).toBe(0);
    sibling.remove();
  });

  it("writes no cookie and no global state until the user changes the sidebar", () => {
    media = mockMatchMedia({ [DESKTOP]: true });
    const cookiesBefore = document.cookie;
    const keys = Object.keys(window);
    renderUi(<Demo />);
    expect(document.cookie).toBe(cookiesBefore);
    expect(Object.keys(window)).toEqual(keys);
  });
});

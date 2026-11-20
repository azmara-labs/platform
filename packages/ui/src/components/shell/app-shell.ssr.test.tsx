// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { AppShell, NavGroup, NavItem, Sidebar } from "./index.js";

const page = (defaultMode: "pinned" | "hidden") => (
  <AppShell
    defaultMode={defaultMode}
    topBar={<AppShell.TopBar brand="Brand" />}
    sidebar={
      <Sidebar label="Main">
        <NavGroup>
          <NavItem href="/" current>
            Home
          </NavItem>
        </NavGroup>
      </Sidebar>
    }
  >
    <p>Content</p>
  </AppShell>
);

describe("AppShell renders on the server", () => {
  it("renders the remembered mode into the markup with no browser globals", () => {
    const hidden = expectServerSafe(page("hidden"));
    const pinned = expectServerSafe(page("pinned"));
    expect(hidden).toContain('data-sidebar="hidden"');
    expect(pinned).toContain('data-sidebar="pinned"');
    expect(hidden).toContain("inert");
    expect(pinned).not.toContain("inert");
    for (const html of [hidden, pinned]) {
      expect(html).toContain("<main");
      expect(html).toContain("Skip to content");
      expect(html).toContain("Content");
    }
  });

  it("renders no edge zone on the server, since it needs a pointer", () => {
    expect(expectServerSafe(page("hidden"))).not.toContain("data-peek-zone");
  });
});

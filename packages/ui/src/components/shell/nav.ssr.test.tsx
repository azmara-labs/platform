// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { NavGroup, NavItem, Sidebar, SidebarFooter } from "./index.js";

describe("the shell sidebar renders on the server", () => {
  it("renders the landmark, the current marker, badges and footer with no browser globals", () => {
    const html = expectServerSafe(
      <Sidebar label="Main">
        <NavGroup title="Orders">
          <NavItem href="/" current>
            Home
          </NavItem>
          <NavItem href="/orders" badge={3}>
            My orders
          </NavItem>
        </NavGroup>
        <SidebarFooter>Footer</SidebarFooter>
      </Sidebar>,
    );
    expect(html).toContain('aria-label="Main"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/orders"');
    expect(html).toContain("Orders");
    expect(html).toContain("Footer");
    expect(html).toContain(">3<");
  });
});

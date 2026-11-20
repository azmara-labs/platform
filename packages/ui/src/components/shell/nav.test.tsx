import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { NavGroup, NavItem, Sidebar, SidebarFooter } from "./index.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("NavItem", () => {
  it("marks the current page, and only the current page", () => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/" current>
          Home
        </NavItem>
        <NavItem href="/orders">Orders</NavItem>
      </NavGroup>,
    );
    const [home, orders] = Array.from(container.querySelectorAll("a"));
    expect(home?.getAttribute("aria-current")).toBe("page");
    expect(orders?.hasAttribute("aria-current")).toBe(false);
  });

  it("renders your router's Link with our classes merged and its own props kept", () => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem render={<a data-router-link="" href="/x" className="mine" />}>Go</NavItem>
      </NavGroup>,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("data-router-link")).toBe("");
    expect(link?.getAttribute("href")).toBe("/x");
    expect(classes(link)).toContain("mine");
    expect(classes(link)).toContain("rounded-md");
    expect(link?.textContent).toBe("Go");
  });

  it.each([
    [3, "3"],
    [150, "99+"],
    [99, "99"],
    ["New", "New"],
  ])("shows a badge of %s as %s", (badge, shown) => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/" badge={badge}>
          Inbox
        </NavItem>
      </NavGroup>,
    );
    expect(container.querySelector("[data-nav-badge]")?.textContent).toBe(shown);
  });

  it.each([0, "", undefined])("shows no badge for %s", (badge) => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/" badge={badge}>
          Inbox
        </NavItem>
      </NavGroup>,
    );
    expect(container.querySelector("[data-nav-badge]")).toBeNull();
  });

  it("hides the icon from assistive technology", () => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/" icon={<svg data-testid="icon" />}>
          Home
        </NavItem>
      </NavGroup>,
    );
    expect(
      container.querySelector("[data-testid=icon]")?.parentElement?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("truncates a very long label and keeps it as the link's text", () => {
    const long = "A very long page name ".repeat(12).trim();
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/">{long}</NavItem>
      </NavGroup>,
    );
    const label = container.querySelector("a span.truncate");
    expect(label?.textContent).toBe(long);
  });
});

describe("NavGroup", () => {
  it("names its list with its title heading", () => {
    const { container } = renderUi(
      <NavGroup title="Orders">
        <NavItem href="/o">My orders</NavItem>
      </NavGroup>,
    );
    const list = container.querySelector("ul");
    const heading = container.querySelector("h2, h3, [role=heading]");
    expect(heading?.textContent).toBe("Orders");
    expect(list?.getAttribute("aria-labelledby")).toBe(heading?.id);
    expect(heading?.id).not.toBe("");
  });

  it("has a list but no heading without a title", () => {
    const { container } = renderUi(
      <NavGroup>
        <NavItem href="/">Home</NavItem>
      </NavGroup>,
    );
    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("h2, h3, [role=heading]")).toBeNull();
    expect(container.querySelector("ul")?.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("gives two groups two different heading ids", () => {
    const { container } = renderUi(
      <>
        <NavGroup title="A">
          <NavItem href="/a">A</NavItem>
        </NavGroup>
        <NavGroup title="B">
          <NavItem href="/b">B</NavItem>
        </NavGroup>
      </>,
    );
    const ids = Array.from(container.querySelectorAll("ul")).map((u) =>
      u.getAttribute("aria-labelledby"),
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe("Sidebar", () => {
  it("is a navigation landmark named by its label", () => {
    const { container } = renderUi(
      <Sidebar label="Main">
        <NavGroup>
          <NavItem href="/">Home</NavItem>
        </NavGroup>
      </Sidebar>,
    );
    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Main");
  });

  it("requires a label", () => {
    // @ts-expect-error a navigation landmark needs a name
    renderUi(<Sidebar>x</Sidebar>);
  });

  it("scrolls the list on its own while the footer stays outside the scroll area", () => {
    const items = Array.from({ length: 60 }, (_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list in a test
      <NavItem key={i} href={`/${i}`}>
        Page {i}
      </NavItem>
    ));
    const { container } = renderUi(
      <Sidebar label="Main">
        <NavGroup>{items}</NavGroup>
        <SidebarFooter>
          <button type="button">Account</button>
        </SidebarFooter>
      </Sidebar>,
    );
    const region = container.querySelector("[role=region]");
    expect(region?.querySelectorAll("a").length).toBe(60);
    const footerButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Account",
    );
    expect(footerButton).toBeDefined();
    expect(region?.contains(footerButton ?? null)).toBe(false);
    expect(container.querySelector("nav")?.contains(footerButton ?? null)).toBe(true);
  });

  it("passes axe with groups, a current item, a badge and a footer", async () => {
    const { container } = renderUi(
      <Sidebar label="Main">
        <NavGroup title="Orders">
          <NavItem href="/" current icon={<svg aria-hidden="true" />}>
            Home
          </NavItem>
          <NavItem href="/orders" badge={3}>
            My orders
          </NavItem>
        </NavGroup>
        <NavGroup>
          <NavItem href="/settings">Settings</NavItem>
        </NavGroup>
        <SidebarFooter>
          <button type="button">Account</button>
        </SidebarFooter>
      </Sidebar>,
    );
    await expectNoA11yViolations(container);
  });
});

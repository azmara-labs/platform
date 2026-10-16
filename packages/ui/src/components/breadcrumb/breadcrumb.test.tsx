import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "./breadcrumb.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const names = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("li"))
    .filter((li) => li.getAttribute("role") !== "presentation")
    .map((li) => li.textContent?.replace(/\s+/g, " ").trim());

function Compound() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Website relaunch</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb: compound parts", () => {
  it("is a navigation landmark named Breadcrumb, with an ordered list", () => {
    const { container } = renderUi(<Compound />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.getAttribute("aria-label")).toBe("Breadcrumb");
    expect(nav.querySelector("ol")).not.toBeNull();
  });

  it("the landmark can be renamed (for translation, or two trails on a page)", () => {
    const { container } = renderUi(
      <Breadcrumb label="Fil d'Ariane">
        <BreadcrumbList />
      </Breadcrumb>,
    );
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Fil d'Ariane");
  });

  it("links are real links; the current page is plain text marked aria-current=page", () => {
    const { container } = renderUi(<Compound />);
    expect(Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/",
      "/projects",
    ]);
    const page = container.querySelector("[aria-current=page]") as HTMLElement;
    expect(page.textContent).toBe("Website relaunch");
    expect(page.tagName).toBe("SPAN");
    expect(page.closest("a")).toBeNull();
  });

  it("separators are decorative: hidden from assistive technology, with a chevron by default", () => {
    const { container } = renderUi(<Compound />);
    const seps = Array.from(container.querySelectorAll("[data-azmr-separator]"));
    expect(seps).toHaveLength(2);
    for (const s of seps) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
      expect(s.getAttribute("role")).toBe("presentation");
      expect(s.querySelector("svg")).not.toBeNull();
    }
  });

  it("a separator can be any content", () => {
    const { container } = renderUi(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>A</BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>B</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(container.querySelector("[data-azmr-separator]")?.textContent).toBe("/");
  });

  it("a link can render as your router's Link", () => {
    const { container } = renderUi(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <a data-router="" href="/x">
                  Page
                </a>
              }
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const a = container.querySelector("a") as HTMLAnchorElement;
    expect(a.hasAttribute("data-router")).toBe(true);
    expect(a.getAttribute("href")).toBe("/x");
    expect(a.textContent).toBe("Home");
    expect(classes(a)).toContain("hover:text-foreground");
  });

  it("the ellipsis stands for hidden items and is announced as such", () => {
    const { container } = renderUi(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(container.querySelector("li")?.textContent).toContain("More pages");
    expect(classes(container.querySelector(".sr-only"))).toContain("sr-only");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("links are muted, brighten on hover and have a full-strength focus ring", () => {
    const { container } = renderUi(<Compound />);
    expect(classes(container.querySelector("a"))).toEqual(
      expect.arrayContaining([
        "text-muted-foreground",
        "hover:text-foreground",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
        "transition-colors",
      ]),
    );
    expect(classes(container.querySelector("[aria-current=page]"))).toEqual(
      expect.arrayContaining(["font-medium", "text-foreground"]),
    );
  });

  it("wraps onto several lines on a narrow screen", () => {
    const { container } = renderUi(<Compound />);
    expect(classes(container.querySelector("ol"))).toEqual(
      expect.arrayContaining(["flex", "flex-wrap", "items-center", "gap-1.5"]),
    );
  });

  it("Tab visits each link in order and skips the separators and the current page", async () => {
    const user = setupUser();
    const { container } = renderUi(<Compound />);
    const links = container.querySelectorAll("a");
    await user.tab();
    expect(document.activeElement).toBe(links[0]);
    await user.tab();
    expect(document.activeElement).toBe(links[1]);
    await user.tab();
    expect(document.activeElement).not.toBe(container.querySelector("[aria-current=page]"));
  });

  it("passes axe", async () => {
    const { container } = renderUi(<Compound />);
    await expectNoA11yViolations(container);
  });
});

describe("Breadcrumbs: from data", () => {
  const items = [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Website", href: "/projects/website" },
    { label: "Design", href: "/projects/website/design" },
    { label: "Tokens", href: "/projects/website/design/tokens" },
    { label: "Colours" },
  ];

  it("renders each item, with separators between them, and the last as the current page", () => {
    const { container } = renderUi(<Breadcrumbs items={items.slice(0, 3)} />);
    expect(names(container)).toEqual(["Home", "Projects", "Website"]);
    expect(container.querySelectorAll("[data-azmr-separator]")).toHaveLength(2);
    expect(container.querySelector("[aria-current=page]")?.textContent).toBe("Website");
  });

  it("the last item is the page even if it was given an href (it is where you are)", () => {
    const { container } = renderUi(<Breadcrumbs items={items.slice(0, 3)} />);
    expect(container.querySelectorAll("a")).toHaveLength(2);
  });

  it("an item without an href is plain text", () => {
    const { container } = renderUi(
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Section" }, { label: "Page" }]}
      />,
    );
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(names(container)).toEqual(["Home", "Section", "Page"]);
  });

  it("collapses the middle into an ellipsis past maxItems, keeping the first and the last ones", () => {
    const { container } = renderUi(<Breadcrumbs items={items} maxItems={4} />);
    expect(names(container)).toEqual(["Home", "More pages", "Tokens", "Colours"]);
    expect(container.querySelector("[aria-current=page]")?.textContent).toBe("Colours");
  });

  it("does not collapse at or under maxItems", () => {
    const { container } = renderUi(<Breadcrumbs items={items.slice(0, 4)} maxItems={4} />);
    expect(names(container)).toEqual(["Home", "Projects", "Website", "Design"]);
  });

  it("with no maxItems it never collapses", () => {
    const { container } = renderUi(<Breadcrumbs items={items} />);
    expect(names(container)).toHaveLength(6);
  });

  it("can use your router's link", () => {
    const { container } = renderUi(
      <Breadcrumbs
        items={items.slice(0, 2)}
        renderLink={(href) => (
          <a data-router="" href={href}>
            Page
          </a>
        )}
      />,
    );
    expect(container.querySelector("a[data-router]")).not.toBeNull();
  });

  it("an empty list renders nothing", () => {
    const { container } = renderUi(<Breadcrumbs items={[]} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("passes axe, collapsed and not", async () => {
    const a = renderUi(<Breadcrumbs items={items} />);
    await expectNoA11yViolations(a.container);
    a.unmount();
    const b = renderUi(<Breadcrumbs items={items} maxItems={3} />);
    await expectNoA11yViolations(b.container);
  });
});

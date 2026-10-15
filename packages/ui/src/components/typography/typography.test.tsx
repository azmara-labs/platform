import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { Code, Heading, Kbd, Link, Text, Typography } from "./typography.js";

const first = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

describe("Typography: variant picks the semantic element", () => {
  it.each([
    ["h1", "H1"],
    ["h2", "H2"],
    ["h3", "H3"],
    ["h4", "H4"],
    ["h5", "H5"],
    ["h6", "H6"],
    ["lead", "P"],
    ["body", "P"],
    ["small", "P"],
    ["caption", "SPAN"],
    ["overline", "SPAN"],
  ] as const)("variant %s renders a <%s>", (variant, tag) => {
    const { container } = renderUi(<Typography variant={variant}>Text</Typography>);
    expect(first(container).tagName).toBe(tag);
  });

  it("defaults to body, a paragraph", () => {
    const { container } = renderUi(<Typography>Hello</Typography>);
    expect(first(container).tagName).toBe("P");
    expect(classes(first(container))).toContain("text-base");
  });

  it("uses the type scale: each heading is larger than the next", () => {
    const sizes = ["h1", "h2", "h3", "h4"].map((v) => {
      const { container } = renderUi(<Typography variant={v as "h1"}>x</Typography>);
      return classes(first(container)).find((c) => /^text-(?:[2-9]?xl|lg|base|sm|xs)$/.test(c));
    });
    expect(sizes).toEqual(["text-4xl", "text-3xl", "text-2xl", "text-xl"]);
  });

  it("lets `as` change the element without changing the look (visual vs semantic level)", () => {
    const { container } = renderUi(
      <Typography variant="h1" as="h2">
        Section
      </Typography>,
    );
    expect(first(container).tagName).toBe("H2");
    expect(classes(first(container))).toContain("text-4xl");
  });

  it("uses colour tokens only", () => {
    const { container } = renderUi(<Typography variant="caption">c</Typography>);
    expect(classes(first(container))).toContain("text-muted-foreground");
  });
});

describe("Typography: composition", () => {
  it("merges className last so it can override the scale", () => {
    const { container } = renderUi(
      <Typography variant="h1" className="text-2xl mt-4">
        x
      </Typography>,
    );
    const list = classes(first(container));
    expect(list).toContain("text-2xl");
    expect(list).not.toContain("text-4xl");
    expect(list).toContain("mt-4");
  });

  it("forwards the ref and extra attributes", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderUi(
      <Typography ref={ref} id="t" data-testid="x">
        x
      </Typography>,
    );
    expect(ref.current).toBe(first(container));
    expect(first(container).id).toBe("t");
    expect(first(container).getAttribute("data-testid")).toBe("x");
  });

  it("supports noWrap, align and gutterBottom (the MUI props the codemod maps)", () => {
    const { container } = renderUi(
      <Typography noWrap align="center" gutterBottom>
        x
      </Typography>,
    );
    const list = classes(first(container));
    expect(list).toContain("truncate");
    expect(list).toContain("text-center");
    expect(list).toContain("mb-[0.35em]");
  });
});

describe("Heading", () => {
  it("renders the element for its level with that level's look", () => {
    const { container } = renderUi(<Heading level={3}>Title</Heading>);
    expect(first(container).tagName).toBe("H3");
    expect(classes(first(container))).toContain("text-2xl");
  });

  it("separates the visual size from the semantic level", () => {
    const { container } = renderUi(
      <Heading level={2} size="h4">
        Quiet section
      </Heading>,
    );
    expect(first(container).tagName).toBe("H2");
    expect(classes(first(container))).toContain("text-xl");
  });

  it("defaults to level 2", () => {
    const { container } = renderUi(<Heading>Default</Heading>);
    expect(first(container).tagName).toBe("H2");
  });
});

describe("Text", () => {
  it("is a paragraph by default and can be a span", () => {
    expect(first(renderUi(<Text>a</Text>).container).tagName).toBe("P");
    expect(first(renderUi(<Text as="span">a</Text>).container).tagName).toBe("SPAN");
  });

  it.each([
    ["muted", "text-muted-foreground"],
    ["destructive", "text-destructive"],
    ["success", "text-success"],
    ["warning", "text-warning-foreground"],
    ["info", "text-info"],
  ] as const)("tone %s uses %s", (tone, cls) => {
    const { container } = renderUi(<Text tone={tone}>a</Text>);
    expect(classes(first(container))).toContain(cls);
  });

  it.each([
    ["sm", "text-sm"],
    ["base", "text-base"],
    ["lg", "text-lg"],
  ] as const)("size %s uses %s", (size, cls) => {
    const { container } = renderUi(<Text size={size}>a</Text>);
    expect(classes(first(container))).toContain(cls);
  });

  it("supports weight", () => {
    const { container } = renderUi(<Text weight="semibold">a</Text>);
    expect(classes(first(container))).toContain("font-semibold");
  });
});

describe("Link", () => {
  it("renders an anchor with the href and underlines it by default (not colour alone)", () => {
    const { container } = renderUi(<Link href="/docs">Docs</Link>);
    const a = first(container);
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe("/docs");
    expect(classes(a)).toContain("underline");
  });

  it.each([
    ["always", "underline"],
    ["hover", "hover:underline"],
    ["none", "no-underline"],
  ] as const)("underline=%s uses %s", (underline, cls) => {
    const { container } = renderUi(
      <Link href="/x" underline={underline}>
        x
      </Link>,
    );
    expect(classes(first(container))).toContain(cls);
  });

  it("underline=hover also underlines on keyboard focus, so the cue is not mouse-only", () => {
    const { container } = renderUi(
      <Link href="/x" underline="hover">
        x
      </Link>,
    );
    expect(classes(first(container))).toContain("focus-visible:underline");
  });

  it("external links open safely and tell screen readers", () => {
    const { container } = renderUi(
      <Link href="https://example.com" external>
        Example
      </Link>,
    );
    const a = first(container);
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a.textContent).toContain("Example");
    expect(a.querySelector(".sr-only")?.textContent).toBe("(opens in a new tab)");
  });

  it("non-external links have no target and no hint", () => {
    const { container } = renderUi(<Link href="/x">x</Link>);
    const a = first(container);
    expect(a.hasAttribute("target")).toBe(false);
    expect(a.querySelector(".sr-only")).toBeNull();
  });

  it("has a visible, full-strength focus ring", () => {
    const { container } = renderUi(<Link href="/x">x</Link>);
    expect(classes(first(container))).toContain("focus-visible:ring-ring");
  });

  it("renders a custom component through `as` (a router link) and passes props to it", () => {
    function RouterLink({
      to,
      children,
      ...rest
    }: {
      to: string;
      className?: string;
      children?: React.ReactNode;
    }) {
      return (
        <a data-router="yes" href={to} {...rest}>
          {children}
        </a>
      );
    }
    const { container } = renderUi(
      <Link as={RouterLink} to="/dashboard" className="x">
        Dashboard
      </Link>,
    );
    const a = first(container);
    expect(a.getAttribute("data-router")).toBe("yes");
    expect(a.getAttribute("href")).toBe("/dashboard");
    expect(classes(a)).toContain("x");
    expect(classes(a)).toContain("underline");
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLAnchorElement>();
    renderUi(
      <Link href="/x" ref={ref}>
        x
      </Link>,
    );
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
});

describe("Code and Kbd", () => {
  it("renders inline code and a keyboard key with the right elements", () => {
    expect(first(renderUi(<Code>pnpm add</Code>).container).tagName).toBe("CODE");
    expect(first(renderUi(<Kbd>Esc</Kbd>).container).tagName).toBe("KBD");
  });

  it("styles them from tokens and merges className", () => {
    const code = first(renderUi(<Code className="p-4">x</Code>).container);
    expect(classes(code)).toContain("bg-muted");
    expect(classes(code)).toContain("p-4");
    expect(classes(first(renderUi(<Kbd>x</Kbd>).container))).toContain("border-border");
  });
});

describe("Typography: accessibility", () => {
  it("passes axe for a realistic page fragment", async () => {
    const { container } = renderUi(
      <article>
        <Typography variant="h1">Customers</Typography>
        <Typography variant="lead">Everyone you work with.</Typography>
        <Heading level={2}>Recent</Heading>
        <Text>
          Press <Kbd>Enter</Kbd> to open, or run <Code>pnpm dev</Code>. See the{" "}
          <Link href="/docs">docs</Link> or{" "}
          <Link href="https://example.com" external>
            the site
          </Link>
          .
        </Text>
        <Typography variant="caption">Updated today</Typography>
      </article>,
    );
    await expectNoA11yViolations(container);
  });
});

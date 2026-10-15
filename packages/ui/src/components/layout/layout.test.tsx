import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { AspectRatio } from "./aspect-ratio.js";
import { Container } from "./container.js";
import { Grid, GridItem } from "./grid.js";
import { Separator } from "./separator.js";
import { Stack } from "./stack.js";

const first = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

describe("Stack", () => {
  it("is a column flex container by default with no gap", () => {
    const { container } = renderUi(<Stack>a</Stack>);
    const list = classes(first(container));
    expect(list).toContain("flex");
    expect(list).toContain("flex-col");
    expect(list).toContain("gap-0");
  });

  it("supports row direction, gap, align, justify and wrap", () => {
    const { container } = renderUi(
      <Stack direction="row" gap={4} align="center" justify="between" wrap>
        a
      </Stack>,
    );
    const list = classes(first(container));
    expect(list).toEqual(
      expect.arrayContaining(["flex-row", "gap-4", "items-center", "justify-between", "flex-wrap"]),
    );
    expect(list).not.toContain("flex-col");
  });

  it("follows the density token with gap=density", () => {
    const { container } = renderUi(<Stack gap="density">a</Stack>);
    expect(classes(first(container))).toContain("gap-(--density-gap)");
  });

  it("takes a responsive direction: a column on phones, a row from md", () => {
    const { container } = renderUi(<Stack direction={{ base: "column", md: "row" }}>a</Stack>);
    const list = classes(first(container));
    expect(list).toContain("flex-col");
    expect(list).toContain("md:flex-row");
    expect(list).not.toContain("flex-row");
  });

  it("ignores unknown breakpoints and values instead of emitting broken classes", () => {
    const { container } = renderUi(
      <Stack direction={{ base: "row", huge: "column" } as never}>a</Stack>,
    );
    const list = classes(first(container));
    expect(list).toContain("flex-row");
    expect(list.some((c) => c.includes("undefined") || c.startsWith("huge"))).toBe(false);
  });

  it("renders a different element with `as`", () => {
    const { container } = renderUi(
      <Stack as="ul">
        <li>a</li>
      </Stack>,
    );
    expect(first(container).tagName).toBe("UL");
  });

  it("inserts a divider between children, never before the first or after the last", () => {
    const { container } = renderUi(
      <Stack divider={<Separator />}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Stack>,
    );
    const kids = Array.from(first(container).children).map((el) => el.tagName);
    expect(kids).toEqual(["SPAN", "HR", "SPAN", "HR", "SPAN"]);
  });

  it("skips empty children when placing dividers", () => {
    const { container } = renderUi(
      <Stack divider={<Separator />}>
        <span>a</span>
        {null}
        {false}
        <span>b</span>
      </Stack>,
    );
    expect(Array.from(first(container).children).map((el) => el.tagName)).toEqual([
      "SPAN",
      "HR",
      "SPAN",
    ]);
  });

  it("merges className last and forwards ref and attributes", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderUi(
      <Stack ref={ref} gap={2} className="gap-8 p-4" data-testid="s">
        a
      </Stack>,
    );
    const list = classes(first(container));
    expect(list).toContain("gap-8");
    expect(list).not.toContain("gap-2");
    expect(ref.current).toBe(first(container));
    expect(first(container).getAttribute("data-testid")).toBe("s");
  });
});

describe("Grid and GridItem", () => {
  it("is a grid container with a column count", () => {
    const { container } = renderUi(<Grid cols={3}>a</Grid>);
    const list = classes(first(container));
    expect(list).toContain("grid");
    expect(list).toContain("grid-cols-3");
  });

  it("takes responsive columns: one on phones, three from md, four from xl", () => {
    const { container } = renderUi(
      <Grid cols={{ base: 1, md: 3, xl: 4 }} gap={6}>
        a
      </Grid>,
    );
    const list = classes(first(container));
    expect(list).toEqual(
      expect.arrayContaining(["grid-cols-1", "md:grid-cols-3", "xl:grid-cols-4", "gap-6"]),
    );
  });

  it("defaults to a single column", () => {
    const { container } = renderUi(<Grid>a</Grid>);
    expect(classes(first(container))).toContain("grid-cols-1");
  });

  it("supports an auto-fit grid by minimum item width", () => {
    const { container } = renderUi(<Grid minItemWidth="16rem">a</Grid>);
    const el = first(container);
    expect(el.style.getPropertyValue("--azmr-grid-min")).toBe("16rem");
    expect(classes(el).some((c) => c.startsWith("grid-cols-[repeat(auto-fit"))).toBe(true);
    expect(classes(el)).not.toContain("grid-cols-1");
  });

  it("rejects a minItemWidth that is not a plain CSS length (it ends up in a style attribute)", () => {
    for (const bad of ["16rem; background:red", "url(x)", "calc(1px", "16"]) {
      expect(() => renderUi(<Grid minItemWidth={bad}>a</Grid>), bad).toThrow(/minItemWidth/);
    }
  });

  it("aligns items on both axes", () => {
    const { container } = renderUi(
      <Grid align="center" justify="end">
        a
      </Grid>,
    );
    expect(classes(first(container))).toEqual(
      expect.arrayContaining(["items-center", "justify-items-end"]),
    );
  });

  it("GridItem spans columns, responsively (the replacement for MUI's item xs/md)", () => {
    const { container } = renderUi(
      <Grid cols={12}>
        <GridItem span={{ base: 12, md: 6 }}>a</GridItem>
        <GridItem span="full">b</GridItem>
      </Grid>,
    );
    const items = Array.from(first(container).children);
    expect(classes(items[0] as Element)).toEqual(
      expect.arrayContaining(["col-span-12", "md:col-span-6"]),
    );
    expect(classes(items[1] as Element)).toContain("col-span-full");
  });

  it("GridItem without a span adds no span class", () => {
    const { container } = renderUi(<GridItem>a</GridItem>);
    expect(classes(first(container)).some((c) => c.includes("col-span"))).toBe(false);
  });

  it("forwards refs", () => {
    const ref = createRef<HTMLElement>();
    renderUi(<Grid ref={ref}>a</Grid>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});

describe("Container", () => {
  it("centres, limits the width and adds responsive gutters", () => {
    const { container } = renderUi(<Container>a</Container>);
    const list = classes(first(container));
    expect(list).toEqual(
      expect.arrayContaining(["mx-auto", "w-full", "px-4", "sm:px-6", "lg:px-8"]),
    );
    expect(list.some((c) => c.startsWith("max-w-"))).toBe(true);
  });

  it.each([
    ["sm", "max-w-2xl"],
    ["md", "max-w-4xl"],
    ["lg", "max-w-6xl"],
    ["xl", "max-w-7xl"],
    ["full", "max-w-none"],
  ] as const)("size %s uses %s", (size, cls) => {
    const { container } = renderUi(<Container size={size}>a</Container>);
    expect(classes(first(container))).toContain(cls);
  });

  it("can drop the gutters", () => {
    const { container } = renderUi(<Container gutters={false}>a</Container>);
    expect(classes(first(container)).some((c) => /(^|:)px-/.test(c))).toBe(false);
  });

  it("can render another element", () => {
    expect(first(renderUi(<Container as="main">a</Container>).container).tagName).toBe("MAIN");
  });
});

describe("Separator", () => {
  it("is a real horizontal separator by default", () => {
    const { container } = renderUi(<Separator />);
    const el = first(container);
    expect(el.tagName).toBe("HR");
    expect(classes(el)).toEqual(expect.arrayContaining(["h-px", "w-full", "bg-border"]));
  });

  it("vertical needs role and aria-orientation", () => {
    const { container } = renderUi(<Separator orientation="vertical" />);
    const el = first(container);
    expect(el.getAttribute("role")).toBe("separator");
    expect(el.getAttribute("aria-orientation")).toBe("vertical");
    expect(classes(el)).toEqual(expect.arrayContaining(["w-px", "self-stretch"]));
  });

  it("decorative separators are hidden from assistive technology", () => {
    const { container } = renderUi(<Separator decorative />);
    const el = first(container);
    expect(el.getAttribute("role")).toBe("none");
    expect(el.hasAttribute("aria-orientation")).toBe(false);
  });

  it("merges className and uses only token colours", () => {
    const { container } = renderUi(<Separator className="my-4 bg-primary" />);
    const list = classes(first(container));
    expect(list).toContain("my-4");
    expect(list).toContain("bg-primary");
    expect(list).not.toContain("bg-border");
  });
});

describe("AspectRatio", () => {
  it.each([
    ["square", "aspect-square"],
    ["video", "aspect-video"],
    ["4/3", "aspect-[4/3]"],
    ["3/2", "aspect-[3/2]"],
    ["21/9", "aspect-[21/9]"],
    ["3/4", "aspect-[3/4]"],
  ] as const)("ratio %s uses %s", (ratio, cls) => {
    const { container } = renderUi(<AspectRatio ratio={ratio}>a</AspectRatio>);
    expect(classes(first(container))).toContain(cls);
  });

  it("defaults to video (16/9)", () => {
    const { container } = renderUi(<AspectRatio>a</AspectRatio>);
    expect(classes(first(container))).toContain("aspect-video");
  });

  it("accepts a number as the width-to-height ratio", () => {
    const { container } = renderUi(<AspectRatio ratio={2.5}>a</AspectRatio>);
    expect(first(container).style.getPropertyValue("--azmr-ratio")).toBe("2.5");
    expect(classes(first(container))).toContain("aspect-(--azmr-ratio)");
  });

  it("rejects a ratio that is not a positive finite number or a known name", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, "evil; x:y"]) {
      expect(
        () => renderUi(<AspectRatio ratio={bad as never}>a</AspectRatio>),
        String(bad),
      ).toThrow(/ratio/);
    }
  });

  it("makes direct media children fill the box", () => {
    const { container } = renderUi(
      <AspectRatio>
        <img src="x" alt="" />
      </AspectRatio>,
    );
    expect(classes(first(container))).toEqual(
      expect.arrayContaining(["[&>img]:h-full", "[&>img]:w-full", "[&>img]:object-cover"]),
    );
  });
});

describe("layout: accessibility", () => {
  it("passes axe for a composed layout", async () => {
    const { container } = renderUi(
      <Container as="main">
        <Stack gap={4} divider={<Separator />}>
          <Grid cols={{ base: 1, md: 2 }} gap={4}>
            <GridItem>One</GridItem>
            <GridItem>Two</GridItem>
          </Grid>
          <AspectRatio ratio="square">
            <div>Media</div>
          </AspectRatio>
        </Stack>
      </Container>,
    );
    await expectNoA11yViolations(container);
  });
});

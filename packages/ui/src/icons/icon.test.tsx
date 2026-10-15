import { IconSearch } from "@tabler/icons-react";
import { Check, Search } from "lucide-react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../components/button/button.js";
import { expectNoA11yViolations, renderUi, withReducedMotion } from "../test-utils/index.js";
import { Icon } from "./icon.js";
import { registerIcons, resetIcons } from "./registry.js";

const svg = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

afterEach(() => {
  resetIcons();
  vi.restoreAllMocks();
});

describe("Icon: accessibility", () => {
  it.each([
    ["lucide", Check],
    ["tabler", IconSearch],
  ])("is decorative by default with %s icons (hidden from assistive technology)", (_set, icon) => {
    const { container } = renderUi(<Icon icon={icon} />);
    expect(svg(container).getAttribute("aria-hidden")).toBe("true");
    expect(svg(container).hasAttribute("role")).toBe(false);
  });

  it.each([
    ["lucide", Check],
    ["tabler", IconSearch],
  ])("becomes an image with a name when given aria-label (%s)", (_set, icon) => {
    const { container } = renderUi(<Icon icon={icon} aria-label="Saved" />);
    expect(svg(container).getAttribute("role")).toBe("img");
    expect(svg(container).getAttribute("aria-label")).toBe("Saved");
    expect(svg(container).hasAttribute("aria-hidden")).toBe(false);
  });

  it("supports aria-labelledby as the accessible name", () => {
    const { container } = renderUi(
      <div>
        <span id="lbl">Search</span>
        <Icon icon={Search} aria-labelledby="lbl" />
      </div>,
    );
    expect(svg(container).getAttribute("role")).toBe("img");
    expect(svg(container).getAttribute("aria-labelledby")).toBe("lbl");
    expect(svg(container).hasAttribute("aria-hidden")).toBe(false);
  });

  it("passes axe: decorative icon next to a text label", async () => {
    const { container } = renderUi(<Button startIcon={<Icon icon={Check} />}>Save</Button>);
    await expectNoA11yViolations(container);
  });

  it("passes axe: an icon-only button named by a labelled icon", async () => {
    const { container } = renderUi(
      <Button>
        <Icon icon={Search} aria-label="Search" />
      </Button>,
    );
    await expectNoA11yViolations(container);
    expect(container.querySelector("button")?.textContent).toBe("");
  });

  it("passes axe: a standalone meaningful icon", async () => {
    const { container } = renderUi(<Icon icon={Check} aria-label="Complete" />);
    await expectNoA11yViolations(container);
  });
});

describe("Icon: size, stroke and motion", () => {
  it("defaults to the md size token", () => {
    const { container } = renderUi(<Icon icon={Check} />);
    expect(classes(svg(container))).toContain("size-4");
  });

  it.each([
    ["xs", "size-3"],
    ["sm", "size-3.5"],
    ["md", "size-4"],
    ["lg", "size-5"],
    ["xl", "size-6"],
  ] as const)("size %s uses %s", (size, expected) => {
    const { container } = renderUi(<Icon icon={Check} size={size} />);
    expect(classes(svg(container))).toContain(expected);
  });

  it("accepts a numeric size as width and height, with no size class", () => {
    const { container } = renderUi(<Icon icon={Check} size={30} />);
    expect(svg(container).getAttribute("width")).toBe("30");
    expect(svg(container).getAttribute("height")).toBe("30");
    expect(classes(svg(container)).some((c) => /^size-/.test(c))).toBe(false);
  });

  it.each([
    ["lucide", Check],
    ["tabler", IconSearch],
  ])("applies strokeWidth to %s icons", (_set, icon) => {
    const { container } = renderUi(<Icon icon={icon} strokeWidth={1.5} />);
    expect(svg(container).getAttribute("stroke-width")).toBe("1.5");
  });

  it("spins as essential motion, and only when asked", () => {
    const idle = renderUi(<Icon icon={Check} />);
    expect(classes(svg(idle.container))).not.toContain("animate-spin");
    expect(svg(idle.container).hasAttribute("data-motion")).toBe(false);
    const spinning = renderUi(<Icon icon={Check} spin />);
    expect(classes(svg(spinning.container))).toContain("animate-spin");
    expect(svg(spinning.container).getAttribute("data-motion")).toBe("essential");
  });

  it("keeps spinning under reduced motion (a frozen loader reads as a hung page)", () => {
    withReducedMotion(() => {
      const { container } = renderUi(<Icon icon={Check} spin />);
      expect(svg(container).getAttribute("data-motion")).toBe("essential");
    });
  });
});

describe("Icon: composition", () => {
  it("lets className override the size (tailwind-merge) and keeps the extra class", () => {
    const { container } = renderUi(<Icon icon={Check} className="size-8 text-primary" />);
    const list = classes(svg(container));
    expect(list).toContain("size-8");
    expect(list).not.toContain("size-4");
    expect(list).toContain("text-primary");
  });

  it.each([
    ["lucide", Check],
    ["tabler", IconSearch],
  ])("forwards the ref to the svg (%s)", (_set, icon) => {
    const ref = createRef<SVGSVGElement>();
    renderUi(<Icon icon={icon} ref={ref} />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it("passes other attributes through", () => {
    const { container } = renderUi(<Icon icon={Check} data-testid="i" id="x" />);
    expect(svg(container).getAttribute("data-testid")).toBe("i");
    expect(svg(container).id).toBe("x");
  });

  it("renders any component that accepts svg props, not only library icons", () => {
    const Custom = (props: React.SVGProps<SVGSVGElement>) => (
      // biome-ignore lint/a11y/noSvgWithoutTitle: test double; the Icon supplies role and aria-label
      <svg viewBox="0 0 8 8" {...props}>
        <circle cx="4" cy="4" r="3" />
      </svg>
    );
    const { container } = renderUi(<Icon icon={Custom} aria-label="Dot" />);
    expect(container.querySelector("circle")).not.toBeNull();
    expect(svg(container).getAttribute("role")).toBe("img");
  });
});

describe("Icon: lookup by name", () => {
  it("renders an icon registered with registerIcons", () => {
    registerIcons({ "my-check": Check });
    const { container } = renderUi(<Icon name="my-check" />);
    expect(svg(container)).not.toBeNull();
  });

  it("prefers the icon prop over the name", () => {
    registerIcons({ named: Search });
    const { container } = renderUi(<Icon icon={Check} name="named" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("lucide-check");
  });

  it("renders nothing and explains why for an unknown name (never crashes the page)", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = renderUi(<Icon name="nope" />);
    expect(container.innerHTML).toBe("");
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("nope");
  });

  it("renders nothing when neither icon nor name is given", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = renderUi(<Icon />);
    expect(container.innerHTML).toBe("");
    expect(error).toHaveBeenCalled();
  });

  it("does not resolve inherited object keys as icon names", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const { container } = renderUi(<Icon name={name} />);
      expect(container.innerHTML, name).toBe("");
    }
    expect(error).toHaveBeenCalledTimes(4);
  });
});

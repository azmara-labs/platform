import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, withReducedMotion } from "../../test-utils/index.js";
import { contrast, type Mode, tokenColour } from "../../test-utils/tokens.js";
import { Progress, progressTones } from "./progress.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const bar = (container: HTMLElement) =>
  container.querySelector("[role=progressbar]") as HTMLElement;

describe("Progress: semantics", () => {
  it("is a named progressbar with its value, range and text", () => {
    const { container } = renderUi(<Progress value={40} aria-label="Uploading" />);
    const el = bar(container);
    expect(el.getAttribute("aria-label")).toBe("Uploading");
    expect(el.getAttribute("aria-valuenow")).toBe("40");
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("100");
    expect(el.getAttribute("aria-valuetext")).toBeTruthy();
  });

  it("supports aria-labelledby and requires a name at the type level", () => {
    const { container } = renderUi(
      <div>
        <h2 id="t">Storage</h2>
        <Progress value={10} aria-labelledby="t" />
      </div>,
    );
    expect(bar(container).getAttribute("aria-labelledby")).toBe("t");
    // @ts-expect-error a progress bar needs aria-label or aria-labelledby
    const element = <Progress value={1} />;
    expect(element).toBeTruthy();
  });

  it("is indeterminate when value is null: no aria-valuenow, and it says so", () => {
    const { container } = renderUi(<Progress value={null} aria-label="Loading" />);
    const el = bar(container);
    expect(el.hasAttribute("aria-valuenow")).toBe(false);
    expect(el.hasAttribute("data-indeterminate")).toBe(true);
  });

  it("treats a non-finite value as indeterminate rather than rendering NaN", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const { container } = renderUi(<Progress value={bad} aria-label="x" />);
      expect(bar(container).hasAttribute("aria-valuenow"), String(bad)).toBe(false);
    }
  });

  it("clamps the value into the range", () => {
    const over = renderUi(<Progress value={150} aria-label="x" />);
    expect(bar(over.container).getAttribute("aria-valuenow")).toBe("100");
    const under = renderUi(<Progress value={-5} aria-label="x" />);
    expect(bar(under.container).getAttribute("aria-valuenow")).toBe("0");
  });

  it("never draws more than a full ring or bar for an out-of-range value", () => {
    const ring = renderUi(<Progress variant="circular" value={150} aria-label="x" />);
    const [filled, total] = (
      ring.container.querySelector("circle[data-arc]")?.getAttribute("stroke-dasharray") ?? ""
    )
      .split(" ")
      .map(Number);
    expect((filled as number) / (total as number)).toBeCloseTo(1, 2);
    const emptyRing = renderUi(<Progress variant="circular" value={-20} aria-label="x" />);
    expect(
      emptyRing.container.querySelector("circle[data-arc]")?.getAttribute("stroke-dasharray"),
    ).toMatch(/^0 /);
    const linear = renderUi(<Progress value={150} aria-label="x" />);
    expect(
      (linear.container.querySelector("[class*='bg-primary']") as HTMLElement).style.width,
    ).toBe("100%");
  });

  it("supports a custom range", () => {
    const { container } = renderUi(<Progress value={5} min={0} max={20} aria-label="x" />);
    expect(bar(container).getAttribute("aria-valuemax")).toBe("20");
    expect(bar(container).getAttribute("aria-valuenow")).toBe("5");
  });

  it("takes custom value text for the screen reader", () => {
    const { container } = renderUi(
      <Progress value={3} max={10} aria-label="Steps" valueText={(v) => `Step ${v} of 10`} />,
    );
    expect(bar(container).getAttribute("aria-valuetext")).toBe("Step 3 of 10");
  });
});

describe("Progress: linear", () => {
  it("fills the track to the percentage of the range", () => {
    const { container } = renderUi(<Progress value={25} aria-label="x" />);
    const indicator = container.querySelector("[data-progress-indicator], [class*='bg-primary']");
    expect((indicator as HTMLElement).style.width).toBe("25%");
  });

  it("percentage follows min and max", () => {
    const { container } = renderUi(<Progress value={5} max={20} aria-label="x" />);
    const indicator = container.querySelector("[class*='bg-primary']") as HTMLElement;
    expect(indicator.style.width).toBe("25%");
  });

  it("indeterminate shows a partial, pulsing bar that is not frozen to look complete", () => {
    const { container } = renderUi(<Progress value={null} aria-label="x" />);
    const indicator = container.querySelector("[class*='bg-primary']") as HTMLElement;
    const list = classes(indicator);
    expect(list).toContain("animate-pulse");
    expect(list).toContain("w-2/5");
    expect(indicator.getAttribute("data-motion")).toBe("essential");
  });

  it("keeps its indeterminate cue under reduced motion (a still full bar would read as complete)", () => {
    withReducedMotion(() => {
      const { container } = renderUi(<Progress value={null} aria-label="x" />);
      const indicator = container.querySelector("[class*='bg-primary']") as HTMLElement;
      expect(indicator.getAttribute("data-motion")).toBe("essential");
      expect(classes(indicator)).toContain("w-2/5");
    });
  });

  it.each([
    ["sm", "h-1.5"],
    ["md", "h-2"],
    ["lg", "h-3"],
  ] as const)("size %s is %s tall", (size, cls) => {
    const { container } = renderUi(<Progress value={50} size={size} aria-label="x" />);
    expect(classes(container.querySelector("[class*='bg-muted']"))).toContain(cls);
  });

  it("can show the value as text, hidden from assistive technology (the bar already says it)", () => {
    const { container } = renderUi(<Progress value={40} showValue aria-label="x" />);
    const text = container.querySelector("[data-progress-value]") as HTMLElement;
    expect(text.textContent).toContain("40");
    expect(text.getAttribute("aria-hidden")).toBe("true");
  });

  it("merges className last", () => {
    const { container } = renderUi(<Progress value={1} className="mt-4" aria-label="x" />);
    expect(classes(container.firstElementChild)).toContain("mt-4");
  });
});

describe("Progress: circular", () => {
  it("is a progressbar with an svg ring whose arc follows the value", () => {
    const { container } = renderUi(<Progress variant="circular" value={50} aria-label="x" />);
    expect(bar(container).getAttribute("aria-valuenow")).toBe("50");
    const arc = container.querySelector("circle[data-arc]") as SVGCircleElement;
    const [filled, total] = (arc.getAttribute("stroke-dasharray") ?? "").split(" ").map(Number);
    expect(total).toBeGreaterThan(0);
    expect((filled as number) / (total as number)).toBeCloseTo(0.5, 2);
  });

  it("indeterminate circular spins as essential motion", () => {
    const { container } = renderUi(<Progress variant="circular" value={null} aria-label="x" />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(classes(svg)).toContain("animate-spin");
    expect(svg.getAttribute("data-motion")).toBe("essential");
  });

  it("the svg is decorative: the progressbar carries the meaning", () => {
    const { container } = renderUi(<Progress variant="circular" value={10} aria-label="x" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it.each([
    ["sm", "size-6"],
    ["md", "size-10"],
    ["lg", "size-16"],
  ] as const)("size %s is %s", (size, cls) => {
    const { container } = renderUi(
      <Progress variant="circular" value={10} size={size} aria-label="x" />,
    );
    expect(classes(bar(container))).toContain(cls);
  });
});

describe("Progress: tones keep the indicator visible against its track and the page", () => {
  const modes: Mode[] = ["light", "dark"];
  for (const mode of modes) {
    for (const [tone, def] of Object.entries(progressTones)) {
      it(`${mode} ${tone}: indicator colour is >= 3:1 on the track and on the page`, () => {
        expect(
          contrast(tokenColour(def.token, mode), tokenColour("muted", mode)),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrast(tokenColour(def.token, mode), tokenColour("background", mode)),
        ).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it("the warning tone uses the readable warning colour, not the yellow surface colour", () => {
    expect(progressTones.warning.token).toBe("warning-text");
  });

  it("applies the tone's classes", () => {
    const { container } = renderUi(<Progress value={50} tone="success" aria-label="x" />);
    expect(container.innerHTML).toContain("bg-success");
  });
});

describe("Progress: accessibility", () => {
  it("passes axe in every shape", async () => {
    const shapes = [
      <Progress key="a" value={30} aria-label="A" />,
      <Progress key="b" value={null} aria-label="B" />,
      <Progress key="c" variant="circular" value={60} showValue aria-label="C" />,
      <Progress key="d" variant="circular" value={null} aria-label="D" />,
    ];
    for (const shape of shapes) {
      const { container } = renderUi(shape);
      await expectNoA11yViolations(container);
    }
  });
});

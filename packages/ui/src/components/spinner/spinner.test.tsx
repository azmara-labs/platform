import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { progressTones } from "../progress/tones.js";
import { Spinner, spinnerSizes, spinnerTones } from "./spinner.js";

const svg = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;

describe("Spinner", () => {
  it("is decorative by default (hidden from assistive technology)", () => {
    const { container } = renderUi(<Spinner />);
    expect(svg(container).getAttribute("aria-hidden")).toBe("true");
    expect(svg(container).hasAttribute("role")).toBe(false);
  });

  it("becomes a labelled status when given a label", () => {
    const { container } = renderUi(<Spinner label="Loading customers" />);
    expect(svg(container).getAttribute("role")).toBe("status");
    expect(svg(container).getAttribute("aria-label")).toBe("Loading customers");
    expect(svg(container).hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps spinning under reduced motion because it is essential feedback", () => {
    const { container } = renderUi(<Spinner />);
    expect(svg(container).getAttribute("data-motion")).toBe("essential");
    expect(svg(container).getAttribute("class")).toContain("animate-spin");
  });

  it("defaults to a 1rem square and merges className last", () => {
    const { container } = renderUi(<Spinner className="size-8 text-primary" />);
    const classes = (svg(container).getAttribute("class") ?? "").split(/\s+/);
    expect(classes).toContain("size-8");
    expect(classes).not.toContain("size-4");
    expect(classes).toContain("text-primary");
  });

  it("sizes from xs to xl, or 1em with inherit", () => {
    for (const [size, cls] of Object.entries(spinnerSizes)) {
      const { container } = renderUi(<Spinner size={size as keyof typeof spinnerSizes} />);
      expect(svg(container).getAttribute("class")).toContain(cls);
    }
    expect(spinnerSizes.inherit).toBe("size-[1em]");
  });

  it("follows the text colour by default and takes Progress's tones", () => {
    const plain = renderUi(<Spinner />);
    expect(svg(plain.container).getAttribute("class")).not.toMatch(/\btext-/);
    const { container } = renderUi(<Spinner tone="destructive" />);
    expect(svg(container).getAttribute("class")).toContain("text-destructive");
  });

  it("uses the same colour classes as Progress, whose tones are contrast-checked", () => {
    const { current, ...tones } = spinnerTones;
    expect(current).toBe("");
    expect(tones).toEqual(
      Object.fromEntries(Object.entries(progressTones).map(([tone, def]) => [tone, def.ring])),
    );
  });

  it("waits `delay` ms before fading in, in CSS, while the svg keeps its spin", () => {
    const { container } = renderUi(<Spinner delay={300} />);
    const group = svg(container).querySelector("g") as SVGGElement;
    expect(group.getAttribute("class")).toContain("azmr-fade-in");
    expect(group.style.animationDelay).toBe("300ms");
    expect(svg(container).getAttribute("class")).toContain("animate-spin");

    const immediate = renderUi(<Spinner />);
    expect(svg(immediate.container).querySelector("g")?.hasAttribute("class")).toBe(false);
  });

  it("forwards the ref to the svg element", () => {
    const ref = createRef<SVGSVGElement>();
    renderUi(<Spinner ref={ref} />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it("passes axe in both modes of use", async () => {
    const decorative = renderUi(<Spinner />);
    await expectNoA11yViolations(decorative.container);
    const labelled = renderUi(<Spinner label="Loading" />);
    await expectNoA11yViolations(labelled.container);
  });
});

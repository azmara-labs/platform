import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { Loading } from "./index.js";

const status = (container: HTMLElement) =>
  container.querySelector('[role="status"]') as HTMLElement;

describe("Loading", () => {
  it("is a status that shows and announces its message, with a decorative spinner", () => {
    const { container } = renderUi(<Loading label="Loading invoices…" />);
    const region = status(container);
    expect(region.textContent).toBe("Loading invoices…");
    expect(region.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
  });

  it("says Loading… when no label is given", () => {
    const { container } = renderUi(<Loading />);
    expect(status(container).textContent).toBe("Loading…");
  });

  it("is inline by default: a span, label beside it, no delay", () => {
    const { container } = renderUi(<Loading />);
    const region = status(container);
    expect(region.tagName).toBe("SPAN");
    expect(region.dataset.variant).toBe("inline");
    expect(region.className).toContain("inline-flex");
    expect(region.className).toContain("flex-row");
    expect(region.style.animationDelay).toBe("");
    expect(region.className).not.toContain("azmr-fade-in");
  });

  it.each([
    ["section", "min-h-32"],
    ["page", "min-h-[60vh]"],
  ] as const)("fills its area as a %s, label below, after a 200 ms delay", (variant, height) => {
    const { container } = renderUi(<Loading variant={variant} />);
    const region = status(container);
    expect(region.tagName).toBe("DIV");
    expect(region.className).toContain(height);
    expect(region.className).toContain("flex-col");
    expect(region.className).toContain("azmr-fade-in");
    expect(region.style.animationDelay).toBe("200ms");
    expect(region.querySelector("svg")?.getAttribute("class")).toContain("text-primary");
  });

  it("takes its own delay, and 0 turns the fade off", () => {
    const later = renderUi(<Loading delay={500} />);
    expect(status(later.container).style.animationDelay).toBe("500ms");
    const now = renderUi(<Loading variant="page" delay={0} />);
    expect(status(now.container).className).not.toContain("azmr-fade-in");
  });

  it("keeps a hidden label for screen readers only", () => {
    const { container } = renderUi(<Loading label="Loading data" labelPlacement="hidden" />);
    const text = status(container).querySelector("span:last-child") as HTMLElement;
    expect(text.textContent).toBe("Loading data");
    expect(text.className).toBe("sr-only");
  });

  it("spins a ring around a logo that stays still", () => {
    const { container } = renderUi(<Loading logo={<img src="/logo.svg" alt="" />} />);
    const indicator = container.querySelector('[data-slot="loading-indicator"]') as HTMLElement;
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    expect(indicator.className).toContain("size-8");
    const ring = indicator.querySelector("svg") as SVGSVGElement;
    expect(ring.getAttribute("class")).toContain("animate-spin");
    const logo = indicator.querySelector('[data-slot="loading-logo"]') as HTMLElement;
    expect(logo.querySelector("img")).not.toBeNull();
    expect(logo.className).not.toContain("animate-");
  });

  it("pulses the logo with no ring, and keeps the pulse under reduced motion", () => {
    const { container } = renderUi(
      <Loading logo={<img src="/logo.svg" alt="" />} animation="pulse" />,
    );
    const indicator = container.querySelector('[data-slot="loading-indicator"]') as HTMLElement;
    expect(indicator.querySelector("svg")).toBeNull();
    const logo = indicator.querySelector('[data-slot="loading-logo"]') as HTMLElement;
    expect(logo.className).toContain("animate-pulse");
    expect(logo.dataset.motion).toBe("essential");
  });

  it("passes size and tone to the spinner, and merges className and style last", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderUi(
      <Loading
        ref={ref}
        size="xl"
        tone="success"
        className="text-foreground"
        style={{ minHeight: 40 }}
        variant="section"
      />,
    );
    const region = status(container);
    expect(ref.current).toBe(region);
    expect(region.querySelector("svg")?.getAttribute("class")).toContain("size-12");
    expect(region.querySelector("svg")?.getAttribute("class")).toContain("text-success");
    expect(region.className).toContain("text-foreground");
    expect(region.className).not.toContain("text-muted-foreground");
    expect(region.style.minHeight).toBe("40px");
    expect(region.style.animationDelay).toBe("200ms");
  });

  it("passes axe in each variant, with and without a logo", async () => {
    for (const ui of [
      <Loading key="inline" />,
      <Loading key="section" variant="section" label="Loading invoices" />,
      <Loading key="page" variant="page" logo={<img src="/logo.svg" alt="" />} />,
      <Loading key="hidden" labelPlacement="hidden" />,
    ]) {
      const { container } = renderUi(ui);
      await expectNoA11yViolations(container);
    }
  });
});

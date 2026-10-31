import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { LOADING_BAR_CEILING, LoadingBar, LoadingOverlay, useLoadingState } from "./index.js";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function Probe(props: { loading: boolean; delay?: number; minDuration?: number }) {
  const visible = useLoadingState(props.loading, props);
  return <output>{visible ? "shown" : "hidden"}</output>;
}

describe("useLoadingState", () => {
  const text = (c: HTMLElement) => c.querySelector("output")?.textContent;

  it("shows nothing for a load faster than the delay", () => {
    const { container, rerender } = renderUi(<Probe loading delay={200} />);
    advance(150);
    rerender(<Probe loading={false} delay={200} />);
    advance(1000);
    expect(text(container)).toBe("hidden");
  });

  it("shows after the delay and stays up for the minimum duration", () => {
    const { container, rerender } = renderUi(<Probe loading delay={200} minDuration={400} />);
    expect(text(container)).toBe("hidden");
    advance(200);
    expect(text(container)).toBe("shown");

    advance(100);
    rerender(<Probe loading={false} delay={200} minDuration={400} />);
    expect(text(container)).toBe("shown");
    advance(299);
    expect(text(container)).toBe("shown");
    advance(1);
    expect(text(container)).toBe("hidden");
  });

  it("hides straight away once the minimum has passed", () => {
    const { container, rerender } = renderUi(<Probe loading delay={0} minDuration={400} />);
    expect(text(container)).toBe("shown");
    advance(500);
    rerender(<Probe loading={false} delay={0} minDuration={400} />);
    expect(text(container)).toBe("hidden");
  });

  it("stays up when loading starts again before a pending hide", () => {
    const { container, rerender } = renderUi(<Probe loading delay={0} minDuration={400} />);
    rerender(<Probe loading={false} delay={0} minDuration={400} />);
    advance(200);
    rerender(<Probe loading delay={0} minDuration={400} />);
    advance(1000);
    expect(text(container)).toBe("shown");
  });
});

describe("LoadingOverlay", () => {
  const ui = (active: boolean) => (
    <LoadingOverlay active={active} label="Refreshing invoices" delay={200} minDuration={400}>
      <table>
        <tbody>
          <tr>
            <td>INV-001</td>
          </tr>
        </tbody>
      </table>
    </LoadingOverlay>
  );
  const root = (c: HTMLElement) => c.querySelector('[data-slot="loading-overlay"]') as HTMLElement;

  it("keeps the content, and has an empty status region while idle", () => {
    const { container } = renderUi(ui(false));
    expect(container.textContent).toContain("INV-001");
    expect(root(container).hasAttribute("aria-busy")).toBe(false);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
    expect(container.querySelector('[data-slot="loading-overlay-indicator"]')).toBeNull();
  });

  it("after the delay: dims the content, sets aria-busy, shows and announces the message", () => {
    const { container, rerender } = renderUi(ui(false));
    rerender(ui(true));
    expect(root(container).hasAttribute("aria-busy")).toBe(false);
    advance(200);

    expect(root(container).getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector('[data-slot="loading-overlay-content"]')?.className).toContain(
      "opacity-50",
    );
    const indicator = container.querySelector(
      '[data-slot="loading-overlay-indicator"]',
    ) as HTMLElement;
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    expect(indicator.textContent).toBe("Refreshing invoices");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Refreshing invoices");
    expect(container.textContent).toContain("INV-001");
  });

  it("stays for the minimum duration, then clears", () => {
    const { container, rerender } = renderUi(ui(true));
    advance(200);
    rerender(ui(false));
    advance(399);
    expect(root(container).getAttribute("aria-busy")).toBe("true");
    advance(1);
    expect(root(container).hasAttribute("aria-busy")).toBe(false);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
  });

  it("passes axe while active", async () => {
    vi.useRealTimers();
    const { container } = renderUi(
      <LoadingOverlay active delay={0}>
        <p>Content</p>
      </LoadingOverlay>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("LoadingBar", () => {
  const bar = (c: HTMLElement) => c.querySelector('[role="progressbar"]') as HTMLElement | null;
  const scale = (c: HTMLElement) => {
    const fill = c.querySelector('[data-slot="loading-bar-fill"]') as HTMLElement;
    return Number(/scaleX\(([\d.]+)\)/.exec(fill.style.transform)?.[1]);
  };

  it("renders nothing while idle or for a load faster than the delay", () => {
    const { container, rerender } = renderUi(<LoadingBar loading={false} />);
    expect(bar(container)).toBeNull();
    rerender(<LoadingBar loading />);
    advance(100);
    rerender(<LoadingBar loading={false} />);
    advance(1000);
    expect(bar(container)).toBeNull();
  });

  it("is a labelled, busy, indeterminate progress bar fixed to the top", () => {
    const { container } = renderUi(<LoadingBar loading delay={0} aria-label="Loading page" />);
    const el = bar(container) as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("Loading page");
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.hasAttribute("aria-valuenow")).toBe(false);
    expect(el.className).toContain("fixed");
    expect(el.className).toContain("top-0");
  });

  it("creeps towards the ceiling, slowing down, and never reaches it", () => {
    const { container } = renderUi(<LoadingBar loading delay={0} />);
    const start = scale(container);
    advance(250);
    const first = scale(container) - start;
    advance(250);
    const second = scale(container) - start - first;
    expect(first).toBeGreaterThan(0);
    expect(second).toBeLessThan(first);
    advance(60_000);
    expect(scale(container)).toBeLessThan(LOADING_BAR_CEILING / 100);
    expect(scale(container)).toBeGreaterThan(0.89);
  });

  it("fills to 100%, fades, then goes when loading ends", () => {
    const { container, rerender } = renderUi(<LoadingBar loading delay={0} />);
    advance(1000);
    rerender(<LoadingBar loading={false} delay={0} />);
    expect(scale(container)).toBe(1);
    expect(bar(container)?.dataset.state).toBe("filling");
    expect(bar(container)?.hasAttribute("aria-busy")).toBe(false);
    advance(200);
    expect(bar(container)?.dataset.state).toBe("fading");
    expect(container.querySelector('[data-slot="loading-bar-fill"]')?.className).toContain(
      "opacity-0",
    );
    advance(300);
    expect(bar(container)).toBeNull();
  });

  it("shows a known value instead of creeping, clamped, and reports it", () => {
    const { container, rerender } = renderUi(<LoadingBar loading delay={0} value={40} />);
    advance(1000);
    expect(scale(container)).toBe(0.4);
    expect(bar(container)?.getAttribute("aria-valuenow")).toBe("40");
    rerender(<LoadingBar loading delay={0} value={140} />);
    expect(scale(container)).toBe(1);
  });

  it("moves with transform only and takes Progress's tones", () => {
    const { container } = renderUi(<LoadingBar loading delay={0} tone="success" />);
    const fill = container.querySelector('[data-slot="loading-bar-fill"]') as HTMLElement;
    expect(fill.className).toContain("bg-success");
    expect(fill.className).toContain("transition-[transform,opacity]");
    expect(fill.style.width).toBe("");
  });

  it("passes axe while loading", async () => {
    vi.useRealTimers();
    const { container } = renderUi(<LoadingBar loading delay={0} />);
    await expectNoA11yViolations(container);
  });
});

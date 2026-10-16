import { act, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type MatchMediaMock,
  mockMatchMedia,
  reducedMotionQuery,
  renderUi,
} from "../../test-utils/index.js";
import { CountUp } from "./count-up.js";
import {
  createTransition,
  findViewTransition,
  Transition,
  type TransitionProps,
} from "./transition.js";

let mock: MatchMediaMock | undefined;
afterEach(() => {
  mock?.restore();
  mock = undefined;
  vi.useRealTimers();
});

describe("Transition: feature detection", () => {
  it("finds no ViewTransition in the React we ship against (it is not stable yet)", () => {
    expect(findViewTransition()).toBeUndefined();
  });

  it("recognises ViewTransition under its stable name and its experimental name", () => {
    const Stable = () => null;
    const Experimental = () => null;
    expect(findViewTransition({ ViewTransition: Stable })).toBe(Stable);
    expect(findViewTransition({ unstable_ViewTransition: Experimental })).toBe(Experimental);
    expect(
      findViewTransition({ ViewTransition: Stable, unstable_ViewTransition: Experimental }),
    ).toBe(Stable);
    expect(findViewTransition({})).toBeUndefined();
  });

  it("without it, renders its children and nothing else (a no-op)", () => {
    const { container } = renderUi(
      <Transition name="page">
        <p>Content</p>
      </Transition>,
    );
    expect(container.innerHTML).toBe("<p>Content</p>");
  });

  it("with it, wraps the children and passes the props through", () => {
    const seen: Record<string, unknown>[] = [];
    function FakeViewTransition(props: TransitionProps) {
      const { children, ...rest } = props;
      seen.push(rest);
      return <section data-vt="">{children}</section>;
    }
    const Wrapped = createTransition(() => FakeViewTransition);
    const { container } = renderUi(
      <Wrapped name="hero" enter="fade-in" exit="fade-out" share="morph" default="none">
        <p>Content</p>
      </Wrapped>,
    );
    expect(container.querySelector("section[data-vt] > p")?.textContent).toBe("Content");
    expect(seen[0]).toEqual({
      name: "hero",
      enter: "fade-in",
      exit: "fade-out",
      share: "morph",
      default: "none",
    });
  });

  it("looks the support up each render, so upgrading React turns it on without a code change", () => {
    let available: ((p: { children?: ReactNode }) => ReactNode) | undefined;
    const Wrapped = createTransition(() => available as never);
    const first = renderUi(<Wrapped>x</Wrapped>);
    expect(first.container.querySelector("[data-vt]")).toBeNull();
    first.unmount();
    available = ({ children }) => <div data-vt="">{children}</div>;
    const second = renderUi(<Wrapped>x</Wrapped>);
    expect(second.container.querySelector("[data-vt]")).not.toBeNull();
  });

  it("skips the transition entirely when the person prefers reduced motion", () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: true });
    const Wrapped = createTransition(() => ({ children }: { children?: ReactNode }) => (
      <div data-vt="">{children}</div>
    ));
    const { container } = renderUi(<Wrapped>Content</Wrapped>);
    expect(container.querySelector("[data-vt]")).toBeNull();
    expect(container.textContent).toBe("Content");
  });
});

describe("CountUp", () => {
  const shown = (c: HTMLElement) => c.querySelector("[aria-hidden=true]")?.textContent;
  const spoken = (c: HTMLElement) => c.querySelector(".sr-only")?.textContent;

  function setup() {
    vi.useFakeTimers({
      toFake: [
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
        "Date",
        "setTimeout",
        "clearTimeout",
      ],
    });
  }

  it("shows the value at first, with no animation", () => {
    setup();
    const { container } = renderUi(<CountUp value={1250} />);
    expect(shown(container)).toBe("1,250");
  });

  it("says the final value to screen readers at once, whatever the animation is showing", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={100} duration={1000} />);
    rerender(<CountUp value={500} duration={1000} />);
    expect(spoken(container)).toBe("500");
    expect(container.querySelector("[aria-hidden=true]")).not.toBeNull();
  });

  it("counts from the old value to the new one, ending exactly on it", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={100} duration={1000} />);
    rerender(<CountUp value={500} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const mid = Number((shown(container) ?? "").replace(/,/g, ""));
    expect(mid).toBeGreaterThan(100);
    expect(mid).toBeLessThan(500);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(shown(container)).toBe("500");
  });

  it("never overshoots", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={0} duration={400} />);
    rerender(<CountUp value={80} duration={400} />);
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      act(() => {
        vi.advanceTimersByTime(40);
      });
      seen.push(Number((shown(container) ?? "0").replace(/,/g, "")));
    }
    expect(Math.max(...seen)).toBeLessThanOrEqual(80);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it("can count up on mount, from `from`", () => {
    setup();
    const { container } = renderUi(<CountUp value={200} from={0} animateOnMount duration={1000} />);
    expect(shown(container)).toBe("0");
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(shown(container)).toBe("200");
  });

  it("jumps straight to the value under reduced motion", () => {
    setup();
    mock = mockMatchMedia({ [reducedMotionQuery]: true });
    const { container, rerender } = renderUi(<CountUp value={100} />);
    rerender(<CountUp value={900} />);
    expect(shown(container)).toBe("900");
  });

  it("formats with Intl options and a locale", () => {
    setup();
    const a = renderUi(
      <CountUp value={1234.5} format={{ style: "currency", currency: "NZD" }} locale="en-NZ" />,
    );
    expect(shown(a.container)).toBe("$1,234.50");
    expect(spoken(a.container)).toBe("$1,234.50");
    a.unmount();
    const b = renderUi(
      <CountUp
        value={0.256}
        format={{ style: "percent", maximumFractionDigits: 1 }}
        locale="en-NZ"
      />,
    );
    expect(shown(b.container)).toBe("25.6%");
  });

  it("does not crash when the caller sets only a minimum number of decimals on a whole number", () => {
    // Intl throws a RangeError if the maximum is below the minimum; our whole-number default must yield.
    setup();
    const a = renderUi(<CountUp value={5} format={{ minimumFractionDigits: 2 }} />);
    expect(shown(a.container)).toBe("5.00");
    expect(spoken(a.container)).toBe("5.00");
    a.unmount();
    const b = renderUi(<CountUp value={5} format={{ minimumFractionDigits: 1 }} />);
    expect(shown(b.container)).toBe("5.0");
    b.unmount();
    const c = renderUi(<CountUp value={1234} format={{ maximumSignificantDigits: 2 }} />);
    expect(shown(c.container)).toBe("1,200");
  });

  it("keeps the decimals the caller asked for while counting between whole numbers", () => {
    setup();
    const { container, rerender } = renderUi(
      <CountUp value={0} duration={500} format={{ minimumFractionDigits: 2 }} />,
    );
    rerender(<CountUp value={10} duration={500} format={{ minimumFractionDigits: 2 }} />);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(shown(container)).toMatch(/^\d+\.\d{2}$/);
  });

  it("uses tabular figures so the width does not jitter while counting", () => {
    setup();
    const { container } = renderUi(<CountUp value={5} className="text-xl" />);
    const cls = (container.firstElementChild?.getAttribute("class") ?? "").split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["tabular-nums", "text-xl"]));
  });

  it("cancels its animation when unmounted", () => {
    setup();
    const { rerender, unmount } = renderUi(<CountUp value={0} duration={1000} />);
    rerender(<CountUp value={10} duration={1000} />);
    unmount();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });

  it("shows whole numbers while counting between whole numbers (no 312.456)", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={0} duration={500} />);
    rerender(<CountUp value={1000} duration={500} />);
    for (let i = 0; i < 12; i++) {
      act(() => {
        vi.advanceTimersByTime(40);
      });
      expect(shown(container), String(i)).not.toMatch(/\./);
    }
  });

  it("a new target mid-count carries on from where it is, it does not jump back", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={0} duration={1000} />);
    rerender(<CountUp value={100} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const mid = Number((shown(container) ?? "0").replace(/,/g, ""));
    expect(mid).toBeGreaterThan(50);
    rerender(<CountUp value={200} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(32);
    });
    const next = Number((shown(container) ?? "0").replace(/,/g, ""));
    expect(next).toBeGreaterThanOrEqual(mid);
  });

  it("asks the browser to stop its frame callback when it unmounts", () => {
    setup();
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { rerender, unmount } = renderUi(<CountUp value={0} duration={1000} />);
    rerender(<CountUp value={10} duration={1000} />);
    cancel.mockClear();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("handles a value that does not change, and non-finite values, without breaking", () => {
    setup();
    const { container, rerender } = renderUi(<CountUp value={7} />);
    rerender(<CountUp value={7} />);
    expect(shown(container)).toBe("7");
    rerender(<CountUp value={Number.NaN} />);
    expect(shown(container)).toBe("NaN");
  });
});

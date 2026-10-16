import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type MatchMediaMock,
  mockMatchMedia,
  reducedMotionQuery,
  renderUi,
} from "./test-utils/index.js";
import { useReducedMotion } from "./use-reduced-motion.js";

function Probe() {
  return <output data-testid="v">{String(useReducedMotion())}</output>;
}
const value = (container: HTMLElement) => container.querySelector("[data-testid=v]")?.textContent;

let mock: MatchMediaMock | undefined;
afterEach(() => mock?.restore());

describe("useReducedMotion", () => {
  it("is false when the person has not asked for reduced motion", () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: false });
    const { container } = renderUi(<Probe />);
    expect(value(container)).toBe("false");
  });

  it("is true when they have", () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: true });
    const { container } = renderUi(<Probe />);
    expect(value(container)).toBe("true");
  });

  it("follows the setting while mounted (they can change it in the operating system at any time)", () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: false });
    const { container } = renderUi(<Probe />);
    expect(value(container)).toBe("false");
    act(() => mock?.set(reducedMotionQuery, true));
    expect(value(container)).toBe("true");
    act(() => mock?.set(reducedMotionQuery, false));
    expect(value(container)).toBe("false");
  });

  it("stops listening when unmounted", () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: false });
    const { unmount } = renderUi(<Probe />);
    expect(mock.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(mock.listenerCount()).toBe(0);
  });

  it("is false where matchMedia does not exist", () => {
    const original = window.matchMedia;
    // @ts-expect-error simulating an environment without matchMedia
    window.matchMedia = undefined;
    try {
      const { container } = renderUi(<Probe />);
      expect(value(container)).toBe("false");
    } finally {
      window.matchMedia = original;
    }
  });
});

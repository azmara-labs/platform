import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type MatchMediaMock, mockMatchMedia, renderUi } from "../../test-utils/index.js";
import { useMinWidth } from "./use-min-width.js";

const QUERY = "(min-width: 64rem)";
let media: MatchMediaMock;
afterEach(() => media?.restore());

function Probe() {
  return <output>{String(useMinWidth(QUERY))}</output>;
}

describe("useMinWidth", () => {
  it("reports the current match and follows changes", () => {
    media = mockMatchMedia({ [QUERY]: false });
    const { container } = renderUi(<Probe />);
    expect(container.textContent).toBe("false");
    act(() => media.set(QUERY, true));
    expect(container.textContent).toBe("true");
    act(() => media.set(QUERY, false));
    expect(container.textContent).toBe("false");
  });

  it("stops listening when unmounted", () => {
    media = mockMatchMedia({ [QUERY]: true });
    const { unmount } = renderUi(<Probe />);
    expect(media.listenerCount()).toBe(1);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it("is false when the browser has no matchMedia", () => {
    const original = window.matchMedia;
    // @ts-expect-error simulating an environment without matchMedia
    window.matchMedia = undefined;
    const { container } = renderUi(<Probe />);
    expect(container.textContent).toBe("false");
    window.matchMedia = original;
  });
});

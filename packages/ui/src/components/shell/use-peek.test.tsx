import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firePointer, renderUi } from "../../test-utils/index.js";
import { type PeekOptions, usePeek } from "./use-peek.js";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const pointer = firePointer;

let onExpandedChange: (value: boolean) => void = () => {};
let onDisclosureChange: (value: boolean) => void = () => {};
let probeClose: () => void = () => {};

function Harness(options: PeekOptions) {
  const peek = usePeek(options);
  const [expanded, setExpanded] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  onExpandedChange = setExpanded;
  onDisclosureChange = setDisclosure;
  probeClose = peek.close;
  return (
    <div>
      <div data-testid="zone" {...peek.bindings} />
      <div data-testid="panel" data-peek-panel="" {...peek.bindings}>
        <button type="button" data-testid="inner">
          Inside
        </button>
        <button type="button" data-testid="menu" aria-haspopup="menu" aria-expanded={expanded}>
          Menu
        </button>
        <button type="button" data-testid="disclosure" aria-expanded={disclosure}>
          Group
        </button>
      </div>
      <button type="button" data-testid="outside">
        Outside
      </button>
      <output data-testid="state">{String(peek.peeking)}</output>
    </div>
  );
}

function setup(options: Partial<PeekOptions> = {}) {
  const view = renderUi(<Harness enabled {...options} />);
  const q = (id: string) => view.container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
  return {
    view,
    q,
    peeking: () => q("state").textContent === "true",
    rerender: (next: Partial<PeekOptions>) => view.rerender(<Harness enabled {...next} />),
  };
}

describe("usePeek", () => {
  it("opens after the open delay, and not before", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(119);
    expect(peeking()).toBe(false);
    tick(1);
    expect(peeking()).toBe(true);
  });

  it("does not open if the pointer leaves before the open delay", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(60);
    pointer("pointerout", q("zone"));
    tick(500);
    expect(peeking()).toBe(false);
  });

  it("closes after the close delay when the pointer leaves", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(120);
    pointer("pointerout", q("zone"));
    tick(249);
    expect(peeking()).toBe(true);
    tick(1);
    expect(peeking()).toBe(false);
  });

  it("stays open when the pointer moves from the zone onto the panel", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(120);
    pointer("pointerout", q("zone"), { related: q("panel") });
    tick(100);
    pointer("pointerover", q("panel"), { related: q("zone") });
    tick(1000);
    expect(peeking()).toBe(true);
  });

  it.each(["touch", "pen"])("ignores a %s pointer", (pointerType) => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"), { pointerType });
    tick(1000);
    expect(peeking()).toBe(false);
  });

  it("opens nothing while disabled, and closes if it becomes disabled while open", () => {
    const off = setup({ enabled: false });
    pointer("pointerover", off.q("zone"));
    tick(1000);
    expect(off.peeking()).toBe(false);

    const on = setup();
    pointer("pointerover", on.q("zone"));
    tick(120);
    expect(on.peeking()).toBe(true);
    on.rerender({ enabled: false });
    expect(on.peeking()).toBe(false);
  });

  it("opens on focus, and keeps open when the mouse leaves while focus is inside", () => {
    const { q, peeking } = setup();
    act(() => q("inner").focus());
    expect(peeking()).toBe(true);
    pointer("pointerover", q("panel"));
    pointer("pointerout", q("panel"));
    tick(1000);
    expect(peeking()).toBe(true);
  });

  it("closes when focus leaves to outside, but not when it moves within the panel", () => {
    const { q, peeking } = setup();
    act(() => q("inner").focus());
    act(() => q("menu").focus());
    tick(1000);
    expect(peeking()).toBe(true);
    act(() => q("outside").focus());
    tick(250);
    expect(peeking()).toBe(false);
  });

  it("closes at once on Escape", () => {
    const { q, peeking } = setup();
    act(() => q("inner").focus());
    expect(peeking()).toBe(true);
    act(() => {
      q("inner").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(peeking()).toBe(false);
  });

  it("stays open while something inside is expanded, and closes once it is collapsed", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("panel"));
    tick(120);
    act(() => onExpandedChange(true)); // a menu opened from inside, its popover portalled out
    pointer("pointerout", q("panel"));
    tick(2000);
    expect(peeking()).toBe(true);
    act(() => onExpandedChange(false));
    tick(250);
    expect(peeking()).toBe(false);
  });

  it("re-entering during the close delay cancels the close", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(120);
    pointer("pointerout", q("zone"));
    tick(200);
    pointer("pointerover", q("zone"));
    tick(1000);
    expect(peeking()).toBe(true);
  });

  it("close() closes immediately", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(120);
    act(() => probeClose());
    expect(peeking()).toBe(false);
  });

  it("clears its timer on unmount", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { q, view } = setup();
    pointer("pointerover", q("zone"));
    view.unmount();
    tick(1000);
    expect(vi.getTimerCount()).toBe(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("does not stay open for an expanded disclosure: only an open popup holds it", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("panel"));
    tick(120);
    act(() => onDisclosureChange(true)); // a nested nav group opened inside the panel
    pointer("pointerout", q("panel"));
    tick(250);
    expect(peeking()).toBe(false);
  });

  it("closes on Escape even when focus is not inside the panel (a mouse peek)", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("zone"));
    tick(120);
    expect(peeking()).toBe(true);
    act(() => q("outside").focus());
    act(() => {
      q("outside").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(peeking()).toBe(false);
  });

  it("puts focus back with restoreFocus when it closes with focus inside, and not otherwise", () => {
    const restoreFocus = vi.fn();
    const { q, peeking } = setup({ restoreFocus });
    act(() => q("inner").focus());
    act(() => probeClose());
    expect(peeking()).toBe(false);
    expect(restoreFocus).toHaveBeenCalledTimes(1);

    restoreFocus.mockClear();
    act(() => q("outside").focus());
    pointer("pointerover", q("zone"));
    tick(120);
    expect(peeking()).toBe(true);
    act(() => probeClose());
    expect(restoreFocus).not.toHaveBeenCalled();
  });

  it("does not take focus when it is merely disabled while focus is inside", () => {
    const restoreFocus = vi.fn();
    const { q, rerender } = setup({ restoreFocus });
    act(() => q("inner").focus());
    rerender({ restoreFocus, enabled: false });
    expect(restoreFocus).not.toHaveBeenCalled();
  });

  it("forgets that focus was inside once closed, so a later mouse peek can close", () => {
    // Some browsers do not fire blur when the focused element becomes inert as the panel closes.
    const { q, peeking } = setup();
    act(() => q("inner").focus());
    act(() => {
      q("inner").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(peeking()).toBe(false);
    pointer("pointerover", q("panel"));
    tick(120);
    expect(peeking()).toBe(true);
    pointer("pointerout", q("panel"));
    tick(250);
    expect(peeking()).toBe(false);
  });

  describe("a hover flag the browser no longer agrees with", () => {
    // No leave event fires when the element under the pointer is removed (a menu closing), so the
    // flag can stay true. jsdom has no :hover, so stand in for the browser's answer.
    const original = Element.prototype.matches;
    const browserSays = (hovered: boolean) =>
      vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector) {
        return selector === ":hover" ? hovered : original.call(this, selector);
      });
    afterEach(() => vi.restoreAllMocks());

    it("closes when focus leaves and the browser says the pointer is not over the panel", () => {
      browserSays(false);
      const { q, peeking } = setup();
      pointer("pointerover", q("panel")); // and no pointerleave ever arrives
      tick(120);
      act(() => q("inner").focus());
      act(() => q("outside").focus());
      tick(250);
      expect(peeking()).toBe(false);
    });

    it("stays open when the browser confirms the pointer is over the panel", () => {
      browserSays(true);
      const { q, peeking } = setup();
      pointer("pointerover", q("panel"));
      tick(120);
      act(() => q("inner").focus());
      act(() => q("outside").focus());
      tick(1000);
      expect(peeking()).toBe(true);
    });
  });

  it("leaves Escape to an open popup: it does not also close the peek", () => {
    const { q, peeking } = setup();
    pointer("pointerover", q("panel"));
    tick(120);
    act(() => onExpandedChange(true)); // a menu is open
    act(() => {
      q("outside").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(peeking()).toBe(true);
    act(() => onExpandedChange(false));
    act(() => {
      q("outside").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(peeking()).toBe(false);
  });
});

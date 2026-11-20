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
let probeClose: () => void = () => {};

function Harness(options: PeekOptions) {
  const peek = usePeek(options);
  const [expanded, setExpanded] = useState(false);
  onExpandedChange = setExpanded;
  probeClose = peek.close;
  return (
    <div>
      <div data-testid="zone" {...peek.bindings} />
      <div data-testid="panel" data-peek-panel="" {...peek.bindings}>
        <button type="button" data-testid="inner">
          Inside
        </button>
        <button type="button" data-testid="menu" aria-expanded={expanded}>
          Menu
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
});

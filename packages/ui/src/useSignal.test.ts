import { Signal } from "@azmr/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useSignal } from "./useSignal.js";

// useSignal is a React hook — full render tests go in a future pass
// with @testing-library/react. These tests cover the Signal interaction layer.

describe("useSignal — Signal contract", () => {
  it("Signal initial value is readable", () => {
    const sig = new Signal(42);
    expect(sig.get()).toBe(42);
  });

  it("Signal update is reflected on next get", () => {
    const sig = new Signal<string[]>(["a", "b"]);
    sig.set(["a", "b", "c"]);
    expect(sig.get()).toHaveLength(3);
  });

  it("Signal with object array does not mutate on set", () => {
    const original = [{ id: 1 }, { id: 2 }];
    const sig = new Signal(original);
    const updated = [{ id: 1 }, { id: 2 }, { id: 3 }];
    sig.set(updated);
    expect(original).toHaveLength(2);
    expect(sig.get()).toHaveLength(3);
  });
});

describe("useSignal — rendering (useSyncExternalStore)", () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  function render(sig: Signal<number>) {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    function Display() {
      const value = useSignal(sig);
      return createElement("span", null, String(value));
    }
    act(() => {
      root.render(createElement(Display));
    });
    return container;
  }

  it("renders the current value on mount without waiting for subscribe to fire", () => {
    // Signal.subscribe() deliberately never invokes its callback immediately
    // on subscribe — useSignal must not depend on that to show the initial
    // value; useSyncExternalStore's getSnapshot (backed by peek()) does.
    const sig = new Signal(7);
    const el = render(sig);
    expect(el.textContent).toBe("7");
  });

  it("reflects a set() that happens after mount", () => {
    const sig = new Signal(1);
    const el = render(sig);
    expect(el.textContent).toBe("1");

    act(() => {
      sig.set(2);
    });
    expect(el.textContent).toBe("2");
  });

  it("reflects the latest value when set() is called more than once before the next flush", () => {
    const sig = new Signal(0);
    const el = render(sig);

    act(() => {
      sig.set(1);
      sig.set(2);
      sig.set(3);
    });
    expect(el.textContent).toBe("3"); // not stale on an intermediate value
  });
});

import { computed, Signal } from "@azmr/core";
import { act, createElement, useState } from "react";
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

  it("does not resubscribe across unrelated re-renders", () => {
    const sig = new Signal(1);
    let subscribes = 0;
    let unsubscribes = 0;
    const realSubscribe = sig.subscribe.bind(sig);
    sig.subscribe = (cb: (value: number) => void) => {
      subscribes++;
      const off = realSubscribe(cb);
      return () => {
        unsubscribes++;
        off();
      };
    };

    let bump: () => void = () => {};
    function Comp() {
      const [n, setN] = useState(0);
      bump = () => setN((x) => x + 1);
      const value = useSignal(sig);
      return createElement("span", null, `${value}:${n}`);
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(Comp));
    });
    expect({ subscribes, unsubscribes }).toEqual({ subscribes: 1, unsubscribes: 0 });

    for (let i = 0; i < 10; i++) {
      act(() => bump());
    }
    expect(container.textContent).toBe("1:10");
    expect({ subscribes, unsubscribes }).toEqual({ subscribes: 1, unsubscribes: 0 });
  });

  it("works with a lazy computed() signal and disposes cleanly", () => {
    const source = new Signal(2);
    const doubled = computed(() => source.get() * 2);
    function Comp() {
      return createElement("span", null, String(useSignal(doubled)));
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(Comp));
    });
    expect(container.textContent).toBe("4");
    act(() => {
      source.set(5);
    });
    expect(container.textContent).toBe("10");
    act(() => root.unmount());
    doubled.dispose();
  });

  it("follows a different signal when the prop changes (resubscribes once)", () => {
    const a = new Signal("a");
    const b = new Signal("b");
    let swap: () => void = () => {};
    function Comp() {
      const [useB, setUseB] = useState(false);
      swap = () => setUseB(true);
      return createElement("span", null, useSignal(useB ? b : a));
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(Comp));
    });
    expect(container.textContent).toBe("a");
    act(() => swap());
    expect(container.textContent).toBe("b");
    act(() => {
      b.set("b2");
    });
    expect(container.textContent).toBe("b2");
    act(() => {
      a.set("a2"); // old signal must no longer drive the component
    });
    expect(container.textContent).toBe("b2");
  });
});

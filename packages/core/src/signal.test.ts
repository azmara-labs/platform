import { describe, expect, it, vi } from "vitest";
import { _debugSubscriberCount, batch, computed, effect, Signal, untrack } from "./signal.js";

describe("Signal", () => {
  it("returns initial value", () => {
    const s = new Signal(42);
    expect(s.get()).toBe(42);
  });

  it("updates value on set", () => {
    const s = new Signal(0);
    s.set(10);
    expect(s.get()).toBe(10);
  });

  it("does not notify when value is unchanged", () => {
    const s = new Signal(5);
    const fn = vi.fn(() => s.get());
    effect(fn);
    fn.mockClear();
    s.set(5); // same value
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("effect", () => {
  it("runs immediately", () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("re-runs when a read signal changes", () => {
    const s = new Signal(1);
    const fn = vi.fn(() => s.get());
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not run unboundedly when an effect writes its own signal", () => {
    // The scheduler's generation guard allows at most one re-run per flush
    // cycle when an effect both reads and writes the same signal.
    const s = new Signal(0);
    const fn = vi.fn(() => {
      s.get();
      s.set(s.peek() + 1);
    });
    effect(fn);
    // Initial run + one re-run from the queued set — then deduplicated. Never unbounded.
    expect(fn.mock.calls.length).toBeLessThanOrEqual(3);
    expect(s.peek()).toBeGreaterThan(0);
  });

  it("stops running after dispose", () => {
    const s = new Signal(1);
    const fn = vi.fn(() => s.get());
    const dispose = effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    dispose();
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(1); // no re-run
  });

  it("drops a dependency on a branch that stops being taken, and stays subscribed to the one still read", () => {
    const cond = new Signal(true);
    const a = new Signal("a");
    const b = new Signal("b");
    const fn = vi.fn(() => (cond.get() ? a.get() : b.get()));
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    cond.set(false); // switches to reading only b; re-run drops the `a` dependency
    expect(fn).toHaveBeenCalledTimes(2);
    expect(_debugSubscriberCount(a)).toBe(0);
    expect(_debugSubscriberCount(b)).toBeGreaterThan(0);

    a.set("a2"); // no longer read — must not trigger a re-run
    expect(fn).toHaveBeenCalledTimes(2);

    b.set("b2"); // still read — must trigger a re-run
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("disposing one effect from inside another during the same flush does not crash and the disposed effect does not run", () => {
    const trigger = new Signal(0);
    const target = new Signal(0);
    let targetRuns = 0;

    const disposeTarget = effect(() => {
      target.get();
      targetRuns++;
    });
    expect(targetRuns).toBe(1);

    effect(() => {
      if (trigger.get() > 0) disposeTarget();
    });

    expect(() => trigger.set(1)).not.toThrow();
    expect(_debugSubscriberCount(target)).toBe(0);

    target.set(1); // target's effect is disposed — must not run again
    expect(targetRuns).toBe(1);
  });

  it("subscriber count returns to 0 after dispose", () => {
    const a = new Signal(1);
    const b = new Signal(2);
    const dispose = effect(() => {
      a.get();
      b.get();
    });
    expect(_debugSubscriberCount(a)).toBe(1);
    expect(_debugSubscriberCount(b)).toBe(1);

    dispose();
    expect(_debugSubscriberCount(a)).toBe(0);
    expect(_debugSubscriberCount(b)).toBe(0);
  });

  it("dispose is idempotent — calling it twice does not throw", () => {
    const s = new Signal(0);
    const dispose = effect(() => s.get());
    dispose();
    expect(() => dispose()).not.toThrow();
  });
});

describe("computed", () => {
  it("derives value from signal", () => {
    const price = new Signal(100);
    const doubled = computed(() => price.get() * 2);
    expect(doubled.get()).toBe(200);
    price.set(50);
    expect(doubled.get()).toBe(100);
  });

  it("dispose() stops recomputation and detaches from its source signals", () => {
    const price = new Signal(100);
    const doubled = computed(() => price.get() * 2);
    expect(doubled.peek()).toBe(200);

    doubled.dispose();
    price.set(999);
    expect(doubled.peek()).toBe(200); // frozen at its last computed value
    expect(_debugSubscriberCount(price)).toBe(0);
  });
});

describe("batch", () => {
  it("coalesces multiple set() calls into a single effect run", () => {
    const a = new Signal(1);
    const b = new Signal(2);
    const fn = vi.fn(() => {
      a.get();
      b.get();
    });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      a.set(10);
      b.set(20);
    });
    expect(fn).toHaveBeenCalledTimes(2); // one flush, not two
  });

  it("values update synchronously inside batch — get()/peek() see the latest write immediately", () => {
    const a = new Signal(1);
    batch(() => {
      a.set(5);
      expect(a.peek()).toBe(5);
      a.set(10);
      expect(a.get()).toBe(10);
    });
  });

  it("nested batch() only flushes once, when the outermost batch completes", () => {
    const a = new Signal(1);
    const fn = vi.fn(() => a.get());
    effect(fn);
    fn.mockClear();

    batch(() => {
      a.set(2);
      batch(() => {
        a.set(3);
      });
      expect(fn).not.toHaveBeenCalled(); // still inside the outer batch
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the callback's return value", () => {
    expect(batch(() => 42)).toBe(42);
  });

  it("a set() outside any batch still flushes immediately, as before", () => {
    const a = new Signal(1);
    const fn = vi.fn(() => a.get());
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("untrack", () => {
  it("reads a signal without registering a dependency on the active effect", () => {
    const a = new Signal(1);
    const fn = vi.fn(() => untrack(() => a.get()));
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    a.set(2); // not tracked — must not trigger a re-run
    expect(fn).toHaveBeenCalledTimes(1);
    expect(_debugSubscriberCount(a)).toBe(0);
  });

  it("composes through nested function calls, unlike peek() at a single call site", () => {
    const a = new Signal(1);
    // Simulates third-party/generic code the caller doesn't control, that
    // uses .get() internally rather than .peek() — untrack() still works.
    function genericHelper() {
      return a.get() * 10;
    }
    const fn = vi.fn(() => untrack(genericHelper));
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    a.set(5);
    expect(fn).toHaveBeenCalledTimes(1); // still untracked despite the indirection
  });

  it("is a no-op outside an effect and returns fn's value", () => {
    const a = new Signal(42);
    expect(untrack(() => a.get())).toBe(42);
  });

  it("does not suppress tracking for a signal read outside the untrack callback", () => {
    const a = new Signal(1);
    const b = new Signal(10);
    const fn = vi.fn(() => {
      untrack(() => a.get());
      b.get(); // read normally, outside untrack
    });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    a.set(2);
    expect(fn).toHaveBeenCalledTimes(1); // a is untracked

    b.set(20);
    expect(fn).toHaveBeenCalledTimes(2); // b is tracked as usual
  });

  it("an effect created inside untrack() still tracks its own reads normally", () => {
    const a = new Signal(1);
    const inner = vi.fn();
    untrack(() => {
      effect(() => {
        a.get();
        inner();
      });
    });
    expect(inner).toHaveBeenCalledTimes(1);

    a.set(2);
    expect(inner).toHaveBeenCalledTimes(2); // the inner effect's own tracking is unaffected
  });
});

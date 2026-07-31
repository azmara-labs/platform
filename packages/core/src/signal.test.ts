import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _debugSubscriberCount,
  batch,
  computed,
  effect,
  onError,
  Signal,
  untrack,
} from "./signal.js";

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

  it("does not call a cleanup on the very first run", () => {
    const cleanup = vi.fn();
    effect(() => cleanup);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("runs the previous cleanup before each re-run, not after", () => {
    const s = new Signal(0);
    const order: string[] = [];
    effect(() => {
      const value = s.get();
      order.push(`run:${value}`);
      return () => order.push(`cleanup:${value}`);
    });
    expect(order).toEqual(["run:0"]);

    s.set(1);
    expect(order).toEqual(["run:0", "cleanup:0", "run:1"]);

    s.set(2);
    expect(order).toEqual(["run:0", "cleanup:0", "run:1", "cleanup:1", "run:2"]);
  });

  it("runs the last cleanup on dispose", () => {
    const cleanup = vi.fn();
    const dispose = effect(() => cleanup);
    expect(cleanup).not.toHaveBeenCalled();
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not run cleanup again on a second dispose call", () => {
    const cleanup = vi.fn();
    const dispose = effect(() => cleanup);
    dispose();
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("works fine when fn returns nothing", () => {
    const s = new Signal(0);
    const fn = vi.fn(() => {
      s.get();
    });
    const dispose = effect(fn);
    expect(() => s.set(1)).not.toThrow();
    expect(() => dispose()).not.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
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

describe("onError", () => {
  // Each test registers via onError() and restores via the returned
  // disposer, but a failed assertion mid-test would skip that restore —
  // this net guarantees the module-level handler never leaks between tests.
  const restoreFns: Array<() => void> = [];
  afterEach(() => {
    for (const restore of restoreFns.splice(0)) restore();
  });

  it("a re-run's exception does not propagate out of set()", () => {
    restoreFns.push(onError(() => {}));
    const a = new Signal(1);
    effect(() => {
      if (a.get() === 2) throw new Error("boom");
    });
    expect(() => a.set(2)).not.toThrow();
  });

  it("routes the error to the registered handler", () => {
    const handler = vi.fn();
    restoreFns.push(onError(handler));
    const a = new Signal(1);
    const err = new Error("boom");
    effect(() => {
      if (a.get() === 2) throw err;
    });
    a.set(2);
    expect(handler).toHaveBeenCalledExactlyOnceWith(err);
  });

  it("a throwing subscriber does not stop other subscribers in the same flush", () => {
    restoreFns.push(onError(() => {}));
    const a = new Signal(1);
    const ok = vi.fn();
    effect(() => {
      if (a.get() === 2) throw new Error("boom");
    });
    effect(() => {
      a.get();
      ok();
    });
    ok.mockClear();
    a.set(2);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("restores the previously active handler when the disposer is called", () => {
    const outer = vi.fn();
    const restoreOuter = onError(outer);
    const inner = vi.fn();
    const restoreInner = onError(inner);
    restoreInner(); // back to outer

    const a = new Signal(1);
    effect(() => {
      if (a.get() === 2) throw new Error("boom");
    });
    a.set(2);
    expect(outer).toHaveBeenCalledOnce();
    expect(inner).not.toHaveBeenCalled();

    restoreOuter();
  });

  it("without a registered handler, the error is rethrown asynchronously instead of swallowed", () => {
    const thenSpy = vi.fn();
    // biome-ignore lint/suspicious/noThenProperty: test double standing in for a resolved Promise, not a real thenable
    const fakeResolvedPromise = { then: thenSpy } as unknown as Promise<void>;
    const resolveSpy = vi.spyOn(Promise, "resolve").mockReturnValue(fakeResolvedPromise);

    const a = new Signal(1);
    const err = new Error("boom");
    effect(() => {
      if (a.get() === 2) throw err;
    });

    expect(() => a.set(2)).not.toThrow(); // the flush itself is synchronous and must not throw
    expect(thenSpy).toHaveBeenCalledOnce();
    const rethrow = thenSpy.mock.calls[0]?.[0] as () => void;
    expect(rethrow).toThrow(err);

    resolveSpy.mockRestore();
  });

  it("effect(fn)'s first, synchronous run still throws directly to the caller", () => {
    expect(() =>
      effect(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
  });

  it("a throwing handler does not itself take down the flush or leak out of set()", () => {
    const thenSpy = vi.fn();
    // biome-ignore lint/suspicious/noThenProperty: test double standing in for a resolved Promise, not a real thenable
    const fakeResolvedPromise = { then: thenSpy } as unknown as Promise<void>;
    const resolveSpy = vi.spyOn(Promise, "resolve").mockReturnValue(fakeResolvedPromise);

    const handlerErr = new Error("handler is also broken");
    restoreFns.push(
      onError(() => {
        throw handlerErr;
      }),
    );

    const a = new Signal(1);
    const ok = vi.fn();
    effect(() => {
      if (a.get() === 2) throw new Error("boom");
    });
    effect(() => {
      a.get();
      ok();
    });
    ok.mockClear();

    expect(() => a.set(2)).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1); // the second subscriber still ran
    expect(thenSpy).toHaveBeenCalledOnce();
    const rethrow = thenSpy.mock.calls[0]?.[0] as () => void;
    expect(rethrow).toThrow(handlerErr);

    resolveSpy.mockRestore();
  });
});

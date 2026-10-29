import { act, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderUi } from "./test-utils/index.js";
import {
  type DebouncedCallback,
  useDebouncedCallback,
  useDebouncedValue,
} from "./use-debounced.js";

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

function capture(
  delay: number,
  callback: (value: string) => void,
  onPendingChange?: (p: boolean) => void,
) {
  let fn: DebouncedCallback<[string]> | undefined;
  const ids = new Set<unknown>();
  function Probe({ cb }: { cb: (value: string) => void }) {
    fn = useDebouncedCallback(cb, delay, { onPendingChange });
    ids.add(fn);
    return null;
  }
  const result = renderUi(<Probe cb={callback} />);
  return {
    get fn() {
      return fn as DebouncedCallback<[string]>;
    },
    ids,
    rerender: (cb: (value: string) => void) => result.rerender(<Probe cb={cb} />),
    unmount: result.unmount,
  };
}

describe("useDebouncedCallback", () => {
  it("runs once with the last arguments after the delay", () => {
    const spy = vi.fn();
    const probe = capture(200, spy);
    probe.fn("a");
    tick(150);
    probe.fn("ab");
    tick(199);
    expect(spy).not.toHaveBeenCalled();
    tick(1);
    expect(spy.mock.calls).toEqual([["ab"]]);
  });

  it("flushes, cancels and reports whether a call is waiting", () => {
    const spy = vi.fn();
    const pending = vi.fn();
    const probe = capture(200, spy, pending);
    probe.fn("a");
    expect(probe.fn.isPending()).toBe(true);
    probe.fn.flush();
    expect(spy.mock.calls).toEqual([["a"]]);
    expect(probe.fn.isPending()).toBe(false);
    probe.fn("b");
    probe.fn.cancel();
    tick(500);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(pending.mock.calls).toEqual([[true], [false], [true], [false]]);
    // Flushing with nothing waiting does nothing.
    probe.fn.flush();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("keeps its identity and calls the latest callback", () => {
    const first = vi.fn();
    const second = vi.fn();
    const probe = capture(100, first);
    probe.fn("a");
    probe.rerender(second);
    tick(100);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("a");
    expect(probe.ids.size).toBe(1);
  });

  it("drops a waiting call on unmount", () => {
    const spy = vi.fn();
    const probe = capture(100, spy);
    probe.fn("a");
    probe.unmount();
    tick(500);
    expect(spy).not.toHaveBeenCalled();
  });

  it("runs straight away with a delay of 0", () => {
    const spy = vi.fn();
    const probe = capture(0, spy);
    probe.fn("now");
    expect(spy).toHaveBeenCalledWith("now");
    expect(probe.fn.isPending()).toBe(false);
  });

  it("drops a waiting call when the delay drops to 0 and a new call runs", () => {
    const spy = vi.fn();
    const pending = vi.fn();
    let fn: DebouncedCallback<[string]> | undefined;
    function Probe({ delay }: { delay: number }) {
      fn = useDebouncedCallback(spy, delay, { onPendingChange: pending });
      return null;
    }
    const { rerender } = renderUi(<Probe delay={200} />);
    fn?.("old");
    rerender(<Probe delay={0} />);
    fn?.("new");
    tick(500);
    // The stale call must not land after the new one.
    expect(spy.mock.calls).toEqual([["new"]]);
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });
});

describe("useDebouncedValue", () => {
  it("starts with the value and follows it once it settles", () => {
    const seen: string[] = [];
    let set: (value: string) => void = () => {};
    function Probe() {
      const [value, setValue] = useState("a");
      set = setValue;
      const debounced = useDebouncedValue(value, 200);
      useEffect(() => {
        seen.push(debounced);
      }, [debounced]);
      return null;
    }
    renderUi(<Probe />);
    act(() => set("ab"));
    tick(100);
    act(() => set("abc"));
    tick(199);
    expect(seen).toEqual(["a"]);
    tick(1);
    expect(seen).toEqual(["a", "abc"]);
  });

  it("passes the value through with a delay of 0", () => {
    let latest = "";
    function Probe({ value }: { value: string }) {
      latest = useDebouncedValue(value, 0);
      return null;
    }
    const { rerender } = renderUi(<Probe value="x" />);
    rerender(<Probe value="y" />);
    expect(latest).toBe("y");
  });
});

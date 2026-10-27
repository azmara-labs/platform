import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { setupUser } from "./user.js";

export interface DebounceSubjectProps {
  debounceMs?: number;
  onValueChange: Mock;
  onCommit: Mock;
}

export interface DebounceSubject<V> {
  /** Renders the control with these props and returns its text input. */
  render(props: DebounceSubjectProps): { input: HTMLInputElement; unmount(): void };
  /** Text to type into an empty control, and the value the control reports for it. */
  sample: { text: string; value: V };
}

const DELAY = 300;

/**
 * The debounce contract every text-like control shares (`Input`, `NumberField`, `MoneyField`):
 * `debounceMs` delays `onValueChange`; blur and Enter call `onCommit` and flush the wait;
 * `data-pending` shows the wait; unmount cancels it; an unchanged value is never reported twice.
 */
export function describeDebounceContract<V>(name: string, subject: DebounceSubject<V>) {
  describe(`${name}: debounce contract`, () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const user = () => setupUser({ advanceTimers: vi.advanceTimersByTime, delay: null });
    const values = (mock: Mock) => mock.mock.calls.map((call) => call[0]);
    const tick = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });

    it("waits debounceMs after the last change, then reports once, with data-pending meanwhile", async () => {
      const onValueChange = vi.fn();
      const { input } = subject.render({ debounceMs: DELAY, onValueChange, onCommit: vi.fn() });
      // Typing takes no time on fake timers, so every key lands inside one wait.
      await user().type(input, subject.sample.text);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input.hasAttribute("data-pending")).toBe(true);

      tick(DELAY - 1);
      expect(onValueChange).not.toHaveBeenCalled();
      tick(1);
      expect(values(onValueChange)).toEqual([subject.sample.value]);
      expect(input.hasAttribute("data-pending")).toBe(false);
    });

    it("on blur, sends the waiting value straight away and commits it", async () => {
      const onValueChange = vi.fn();
      const onCommit = vi.fn();
      const { input } = subject.render({ debounceMs: DELAY, onValueChange, onCommit });
      await user().type(input, subject.sample.text);
      act(() => input.blur());
      expect(values(onValueChange)).toEqual([subject.sample.value]);
      expect(values(onCommit)).toEqual([subject.sample.value]);
      expect(input.hasAttribute("data-pending")).toBe(false);
      tick(DELAY * 2);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("on Enter, sends the waiting value and commits it", async () => {
      const onValueChange = vi.fn();
      const onCommit = vi.fn();
      const { input } = subject.render({ debounceMs: DELAY, onValueChange, onCommit });
      await user().type(input, `${subject.sample.text}{Enter}`);
      expect(values(onValueChange)).toEqual([subject.sample.value]);
      expect(values(onCommit)).toEqual([subject.sample.value]);
    });

    it("never reports or commits an unchanged value twice", async () => {
      const onValueChange = vi.fn();
      const onCommit = vi.fn();
      const { input } = subject.render({ debounceMs: DELAY, onValueChange, onCommit });
      const u = user();
      await u.type(input, subject.sample.text);
      tick(DELAY);
      // Change it and change it back inside one wait: nothing new to report.
      await u.type(input, "9{Backspace}");
      tick(DELAY);
      expect(onValueChange).toHaveBeenCalledTimes(1);

      act(() => input.blur());
      act(() => input.focus());
      act(() => input.blur());
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("drops a waiting value when it unmounts", async () => {
      const onValueChange = vi.fn();
      const { input, unmount } = subject.render({
        debounceMs: DELAY,
        onValueChange,
        onCommit: vi.fn(),
      });
      await user().type(input, subject.sample.text);
      unmount();
      tick(DELAY * 2);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("commits on blur without debounceMs too", async () => {
      const onValueChange = vi.fn();
      const onCommit = vi.fn();
      const { input } = subject.render({ onValueChange, onCommit });
      await user().type(input, subject.sample.text);
      expect(onValueChange).toHaveBeenCalled();
      expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(subject.sample.value);
      act(() => input.blur());
      expect(values(onCommit)).toEqual([subject.sample.value]);
    });
  });
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** A debounced function, with ways to run or drop the pending call. */
export interface DebouncedCallback<Args extends unknown[]> {
  (...args: Args): void;
  /** Runs the pending call now, if there is one. */
  flush(): void;
  /** Drops the pending call. */
  cancel(): void;
  /** Whether a call is waiting. */
  isPending(): boolean;
}

export interface UseDebouncedCallbackOptions {
  /** Called when a call starts or stops waiting, for example to set `data-pending`. */
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Delays `callback` until `delayMs` has passed without another call; only the last call's
 * arguments are used. The returned function keeps its identity across renders and always runs the
 * latest `callback`. A pending call is dropped on unmount. With `delayMs` of 0 or less, calls run
 * straight away.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
  options: UseDebouncedCallbackOptions = {},
): DebouncedCallback<Args> {
  const latest = useRef(callback);
  latest.current = callback;
  const onPendingChange = useRef(options.onPendingChange);
  onPendingChange.current = options.onPendingChange;
  const delay = useRef(delayMs);
  delay.current = delayMs;

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const args = useRef<Args | undefined>(undefined);

  const setPending = useCallback((pending: boolean) => {
    onPendingChange.current?.(pending);
  }, []);

  const debounced = useMemo(() => {
    const clear = () => {
      if (timer.current === undefined) return false;
      clearTimeout(timer.current);
      timer.current = undefined;
      return true;
    };
    const run = () => {
      const pendingArgs = args.current;
      args.current = undefined;
      if (clear() || pendingArgs) setPending(false);
      if (pendingArgs) latest.current(...pendingArgs);
    };
    const fn = ((...next: Args) => {
      if (delay.current <= 0) {
        // A call left waiting from a longer delay would otherwise land after this one.
        args.current = undefined;
        if (clear()) setPending(false);
        latest.current(...next);
        return;
      }
      const wasPending = timer.current !== undefined;
      clear();
      args.current = next;
      timer.current = setTimeout(run, delay.current);
      if (!wasPending) setPending(true);
    }) as DebouncedCallback<Args>;
    fn.flush = () => {
      if (timer.current !== undefined) run();
    };
    fn.cancel = () => {
      args.current = undefined;
      if (clear()) setPending(false);
    };
    fn.isPending = () => timer.current !== undefined;
    return fn;
  }, [setPending]);

  // Drop a pending call on unmount, without reporting it: the component is gone.
  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
      timer.current = undefined;
      args.current = undefined;
    },
    [],
  );

  return debounced;
}

/**
 * `value`, held back until it has stopped changing for `delayMs`. Use it to run a search or a
 * fetch from a fast-changing value. On the first render it is `value` itself.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return delayMs <= 0 ? value : debounced;
}

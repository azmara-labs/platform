import type { Signal } from "@azmr/core";
import { useSyncExternalStore } from "react";

/**
 * React hook that subscribes to a Signal and triggers re-renders on change.
 *
 * Built on `useSyncExternalStore` rather than `useState` + `useEffect`, so
 * concurrent rendering can't tear: React reads the current value via
 * `Signal.peek()` (which never registers a dependency) for both the initial
 * render and any snapshot check mid-render, and only uses the subscription
 * to know when to ask again — it does not rely on `Signal.subscribe()`
 * firing immediately with the current value on subscribe (it deliberately
 * doesn't; read the value separately, as this hook does, rather than wait
 * for the first callback).
 */
export function useSignal<T>(signal: Signal<T>): T {
  return useSyncExternalStore(
    (onStoreChange) => signal.subscribe(() => onStoreChange()),
    () => signal.peek(),
    () => signal.peek(),
  );
}

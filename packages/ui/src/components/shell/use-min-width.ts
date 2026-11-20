import { useCallback, useSyncExternalStore } from "react";

const hasMatchMedia = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * Whether the viewport matches a `min-width` media query. `false` on the server and in a browser
 * without `matchMedia`, so the server markup never depends on the viewport: layout is CSS, and
 * this only decides what a click does.
 */
export function useMinWidth(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!hasMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (hasMatchMedia() ? window.matchMedia(query).matches : false),
    () => false,
  );
}

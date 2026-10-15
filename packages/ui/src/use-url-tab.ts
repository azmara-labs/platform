import { useCallback, useSyncExternalStore } from "react";

const URL_CHANGE = "azmr:urlchange";

export interface UseUrlTabOptions<T extends string> {
  /** The search parameter that holds the tab. Default `tab`. */
  param?: string;
  /** The tabs the URL may select. Anything else in the URL is ignored. */
  values: readonly T[];
  /** The tab when the URL says nothing (or something not in `values`). Its URL has no parameter. */
  defaultValue: T;
  /** `replace` (default) rewrites the current entry; `push` adds a history entry per change. */
  history?: "replace" | "push";
}

/**
 * Keeps the selected tab in the URL (`?tab=billing`), so a tab can be linked to, reloaded, and
 * reached with the back button. Router-agnostic: it reads and writes `window.location` and the
 * History API.
 *
 * The URL is untrusted input: a value that is not in `values` is ignored, never passed on. On the
 * server, and during hydration, the value is `defaultValue`, so there is no mismatch; it then
 * follows the URL. Use it with `Tabs`: `<Tabs value={tab} onValueChange={setTab}>`.
 */
export function useUrlTab<T extends string>({
  param = "tab",
  values,
  defaultValue,
  history = "replace",
}: UseUrlTabOptions<T>): [T, (next: T) => void] {
  const valuesKey = values.join("\u0000");

  const value = useSyncExternalStore(
    useCallback((notify: () => void) => {
      window.addEventListener("popstate", notify);
      window.addEventListener(URL_CHANGE, notify);
      return () => {
        window.removeEventListener("popstate", notify);
        window.removeEventListener(URL_CHANGE, notify);
      };
    }, []),
    (): T => {
      const raw = new URLSearchParams(window.location.search).get(param);
      return raw !== null && (values as readonly string[]).includes(raw)
        ? (raw as T)
        : defaultValue;
    },
    () => defaultValue,
  );

  const setValue = useCallback(
    (next: T) => {
      if (!valuesKey.split("\u0000").includes(next)) {
        throw new TypeError(`useUrlTab: "${next}" is not one of the allowed tabs`);
      }
      const url = new URL(window.location.href);
      if (next === defaultValue) url.searchParams.delete(param);
      else url.searchParams.set(param, next);
      const target = `${url.pathname}${url.search}${url.hash}`;
      if (history === "push") window.history.pushState(window.history.state, "", target);
      else window.history.replaceState(window.history.state, "", target);
      window.dispatchEvent(new Event(URL_CHANGE));
    },
    [param, valuesKey, defaultValue, history],
  );

  return [value, setValue];
}

type Listener = (event: { matches: boolean; media: string }) => void;

export interface MatchMediaMock {
  /** Change what a query matches and notify its listeners, like the OS changing preference. */
  set(query: string, matches: boolean): void;
  /** Number of change listeners currently attached (to catch leaks on unmount). */
  listenerCount(): number;
  restore(): void;
}

const normalise = (query: string) => query.replace(/\s+/g, "").toLowerCase();

/**
 * Replace `window.matchMedia` with a controllable stub. `initial` maps media queries
 * (whitespace and case insensitive) to whether they match; everything else does not.
 * jsdom does not implement matchMedia, so components that call it need this.
 */
export function mockMatchMedia(initial: Record<string, boolean> = {}): MatchMediaMock {
  const original = window.matchMedia;
  const state = new Map(Object.entries(initial).map(([q, m]) => [normalise(q), m]));
  const listeners = new Map<string, Set<Listener>>();

  window.matchMedia = ((query: string) => {
    const key = normalise(query);
    const mql = {
      get matches() {
        return state.get(key) ?? false;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        let set = listeners.get(key);
        if (!set) {
          set = new Set();
          listeners.set(key, set);
        }
        set.add(listener);
      },
      removeEventListener: (_type: string, listener: Listener) => {
        listeners.get(key)?.delete(listener);
      },
      addListener: (listener: Listener) => mql.addEventListener("change", listener),
      removeListener: (listener: Listener) => mql.removeEventListener("change", listener),
      dispatchEvent: () => true,
    };
    return mql as unknown as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    set(query, matches) {
      const key = normalise(query);
      state.set(key, matches);
      for (const listener of listeners.get(key) ?? []) listener({ matches, media: query });
    },
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    restore() {
      window.matchMedia = original;
    },
  };
}

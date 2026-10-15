export const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

const normalise = (query: string) => query.replace(/\s+/g, "").toLowerCase();

function installMatchMedia(matches: (query: string) => boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    return {
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        listeners.delete(listener),
      addListener: (listener: EventListenerOrEventListenerObject) => listeners.add(listener),
      removeListener: (listener: EventListenerOrEventListenerObject) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

/** Whether the (possibly stubbed) environment currently asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false;
}

/**
 * Run `fn` with `prefers-reduced-motion: reduce` matching, then restore matchMedia, even
 * if `fn` throws or returns a rejected promise. Use it in every animated component's test.
 */
export function withReducedMotion<T>(fn: () => T): T {
  const restore = installMatchMedia((query) => normalise(query) === normalise(reducedMotionQuery));
  let result: T;
  try {
    result = fn();
  } catch (error) {
    restore();
    throw error;
  }
  if (result instanceof Promise) return result.finally(restore) as T;
  restore();
  return result;
}

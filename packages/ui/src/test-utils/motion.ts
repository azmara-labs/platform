import { mockMatchMedia } from "./match-media.js";

export const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/** Whether the (possibly stubbed) environment currently asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false;
}

/**
 * Run `fn` with `prefers-reduced-motion: reduce` matching, then restore matchMedia, even
 * if `fn` throws or returns a rejected promise. Use it in every animated component's test.
 */
export function withReducedMotion<T>(fn: () => T): T {
  const mock = mockMatchMedia({ [reducedMotionQuery]: true });
  let result: T;
  try {
    result = fn();
  } catch (error) {
    mock.restore();
    throw error;
  }
  if (result instanceof Promise) return result.finally(mock.restore) as T;
  mock.restore();
  return result;
}

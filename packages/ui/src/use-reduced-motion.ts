import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const read = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(QUERY).matches;

/**
 * Whether the person has asked their system for reduced motion. It follows the setting while the app
 * is open. On the server, and during hydration, it is `false`, so there is no mismatch; the global CSS
 * already collapses animations for these people, so this is for JavaScript-driven motion (a count-up, a
 * view transition) that CSS cannot reach.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

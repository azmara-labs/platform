import { useEffect, useRef, useState } from "react";

export interface LoadingStateOptions {
  /** Milliseconds `loading` must stay true before the indicator shows. Default 200. */
  delay?: number;
  /** Once shown, the indicator stays at least this many milliseconds. Default 400. */
  minDuration?: number;
}

/**
 * Whether to show a loading indicator for `loading`: not before `delay` (a fast load shows
 * nothing), and once shown, for at least `minDuration` (no flicker). `loading` going true again
 * before a pending hide keeps the indicator up.
 */
export function useLoadingState(
  loading: boolean,
  { delay = 200, minDuration = 400 }: LoadingStateOptions = {},
): boolean {
  const [visible, setVisible] = useState(() => loading && delay <= 0);
  const shownAt = useRef(visible ? Date.now() : 0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loading && !visible) {
      const show = () => {
        shownAt.current = Date.now();
        setVisible(true);
      };
      if (delay <= 0) show();
      else timer = setTimeout(show, delay);
    } else if (!loading && visible) {
      const remaining = minDuration - (Date.now() - shownAt.current);
      if (remaining <= 0) setVisible(false);
      else timer = setTimeout(() => setVisible(false), remaining);
    }
    return () => clearTimeout(timer);
  }, [loading, visible, delay, minDuration]);

  return visible;
}

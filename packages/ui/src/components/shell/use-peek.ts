import {
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface PeekOptions {
  /** Off below the breakpoint and while the sidebar is pinned: nothing peeks. */
  enabled: boolean;
  /** How long the pointer rests before the sidebar opens, in ms. Default 120. */
  openDelay?: number;
  /** How long after the pointer leaves before it closes, in ms. Default 250. */
  closeDelay?: number;
  /**
   * Called by `close()` when focus is inside the panel, before it closes, so focus is not lost to
   * the page when the panel becomes inert. Not called when the peek is merely disabled.
   */
  restoreFocus?: () => void;
}

export interface PeekBindings {
  onPointerEnter(event: PointerEvent<HTMLElement>): void;
  onPointerLeave(event: PointerEvent<HTMLElement>): void;
  onFocus(event: FocusEvent<HTMLElement>): void;
  onBlur(event: FocusEvent<HTMLElement>): void;
}

const PANEL = "[data-peek-panel]";
const ZONE = "[data-peek-zone]";
// Something inside that has a popup open (a menu, say). Its popover is portalled out of the panel, so
// the pointer "leaves" to reach it. A plain disclosure (a nested nav group) has `aria-expanded` but
// is not a popup, and must not hold the panel open.
const OPEN_POPUP = '[aria-haspopup][aria-expanded="true"], [data-popup-open]';

/**
 * The "peek" of a hidden sidebar: it opens when a mouse rests on the edge zone or focus enters it,
 * and closes shortly after the mouse leaves, or on Escape from anywhere. Spread `bindings` on both
 * the zone and the panel; they share one timer, so moving from one to the other never closes it.
 * Only a mouse counts: a tap fires the same pointer events on a touch screen and must not open it.
 */
export function usePeek({ enabled, openDelay = 120, closeDelay = 250, restoreFocus }: PeekOptions) {
  const [peeking, setPeeking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panel = useRef<Element | null>(null);
  const zone = useRef<Element | null>(null);
  const hovering = useRef(false);
  const focusWithin = useRef(false);
  const restoreRef = useRef(restoreFocus);
  restoreRef.current = restoreFocus;

  const clear = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  /** Closes and forgets pointer and focus, without touching focus: some browsers send no `blur` when a focused element goes inert. */
  const reset = useCallback(() => {
    clear();
    hovering.current = false;
    focusWithin.current = false;
    setPeeking(false);
  }, [clear]);

  const close = useCallback(() => {
    if (panel.current?.contains(document.activeElement)) restoreRef.current?.();
    reset();
  }, [reset]);

  const scheduleClose = useCallback(() => {
    clear();
    timer.current = setTimeout(function attempt() {
      timer.current = undefined;
      // The flag can outlive the pointer: no leave event fires when the element under it is removed
      // (a menu closing), so ask the browser whether the pointer really is over the panel or zone.
      if (hovering.current && ![panel.current, zone.current].some((el) => el?.matches(":hover"))) {
        hovering.current = false;
      }
      if (focusWithin.current || hovering.current) return;
      if (panel.current?.querySelector(OPEN_POPUP)) {
        timer.current = setTimeout(attempt, closeDelay);
        return;
      }
      setPeeking(false);
    }, closeDelay);
  }, [clear, closeDelay]);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  useEffect(() => clear, [clear]);

  // The peek covers content, so it can always be dismissed from the keyboard, not only when focus
  // happens to be inside it (a mouse peek leaves focus where it was).
  useEffect(() => {
    if (!peeking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // An open menu takes the first Escape; the peek stays until the next one.
      if (event.key === "Escape" && !panel.current?.querySelector(OPEN_POPUP)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [peeking, close]);

  const bindings = useMemo<PeekBindings>(() => {
    const remember = (element: HTMLElement) => {
      const foundPanel = element.closest(PANEL);
      if (foundPanel) panel.current = foundPanel;
      const foundZone = element.closest(ZONE);
      if (foundZone) zone.current = foundZone;
    };
    return {
      onPointerEnter(event) {
        if (!enabled || event.pointerType !== "mouse") return;
        remember(event.currentTarget);
        hovering.current = true;
        clear();
        timer.current = setTimeout(() => {
          timer.current = undefined;
          setPeeking(true);
        }, openDelay);
      },
      onPointerLeave(event) {
        if (event.pointerType !== "mouse") return;
        hovering.current = false;
        scheduleClose();
      },
      onFocus(event) {
        if (!enabled) return;
        remember(event.currentTarget);
        focusWithin.current = true;
        clear();
        setPeeking(true);
      },
      onBlur(event) {
        // Focus moving to another element inside the same panel is not leaving it.
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        focusWithin.current = false;
        scheduleClose();
      },
    };
  }, [enabled, openDelay, clear, scheduleClose]);

  return { peeking, bindings, close };
}

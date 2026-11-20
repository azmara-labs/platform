import {
  type FocusEvent,
  type KeyboardEvent,
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
}

export interface PeekBindings {
  onPointerEnter(event: PointerEvent<HTMLElement>): void;
  onPointerLeave(event: PointerEvent<HTMLElement>): void;
  onFocus(event: FocusEvent<HTMLElement>): void;
  onBlur(event: FocusEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

const PANEL = "[data-peek-panel]";
const EXPANDED = '[aria-expanded="true"]';

/**
 * The "peek" of a hidden sidebar: it opens when a mouse rests on the edge zone or focus enters it,
 * and closes shortly after the mouse leaves. Spread `bindings` on both the zone and the panel; they
 * share one timer, so moving from one to the other never closes it. Only a mouse counts: a tap fires
 * the same pointer events on a touch screen and must not open it.
 */
export function usePeek({ enabled, openDelay = 120, closeDelay = 250 }: PeekOptions) {
  const [peeking, setPeeking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panel = useRef<Element | null>(null);
  const hovering = useRef(false);
  const focusWithin = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const scheduleClose = useCallback(() => {
    clear();
    timer.current = setTimeout(function attempt() {
      timer.current = undefined;
      if (focusWithin.current || hovering.current) return;
      // A menu opened from inside is portalled out of the panel, so the pointer "leaves" to reach
      // it. Keep the panel open until nothing inside is expanded.
      if (panel.current?.querySelector(EXPANDED)) {
        timer.current = setTimeout(attempt, closeDelay);
        return;
      }
      setPeeking(false);
    }, closeDelay);
  }, [clear, closeDelay]);

  const close = useCallback(() => {
    clear();
    setPeeking(false);
  }, [clear]);

  useEffect(() => {
    if (!enabled) close();
  }, [enabled, close]);

  useEffect(() => clear, [clear]);

  const bindings = useMemo<PeekBindings>(() => {
    const remember = (element: HTMLElement) => {
      const found = element.closest(PANEL);
      if (found) panel.current = found;
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
      onKeyDown(event) {
        if (event.key === "Escape") close();
      },
    };
  }, [enabled, openDelay, clear, scheduleClose, close]);

  return { peeking, bindings, close };
}

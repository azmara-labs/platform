import { act } from "react";

/**
 * Fire a pointer event the way React needs it. React builds `onPointerEnter` and `onPointerLeave`
 * from `pointerover` and `pointerout`, so those are the events to send. jsdom has no
 * `PointerEvent`, so this is a mouse event with a `pointerType` added.
 */
export function firePointer(
  type: "pointerover" | "pointerout",
  target: Element,
  {
    pointerType = "mouse",
    related = null,
  }: { pointerType?: string; related?: Element | null } = {},
): void {
  const event = new MouseEvent(type, { bubbles: true, relatedTarget: related });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

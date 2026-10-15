import { configure } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import { act } from "react";

// user-event dispatches real DOM events; React needs them inside act() so the resulting
// state updates are flushed before the next assertion (this is what React Testing Library
// configures for itself).
configure({
  eventWrapper: (callback) => {
    let result: ReturnType<typeof callback>;
    act(() => {
      result = callback();
    });
    return result as ReturnType<typeof callback>;
  },
});

/** A user-event instance: realistic typing, clicking and keyboard navigation. */
export function setupUser(options: Parameters<typeof userEvent.setup>[0] = {}) {
  return userEvent.setup(options);
}

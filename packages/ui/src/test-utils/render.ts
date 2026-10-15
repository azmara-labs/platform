import type { ReactElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

interface Mounted {
  root: Root;
  container: HTMLElement;
  unmounted: boolean;
}

const mounted = new Set<Mounted>();

export interface RenderResult {
  container: HTMLElement;
  root: Root;
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
}

/**
 * Render into a fresh container attached to `document.body`, inside `act`, so
 * effects and the state updates they cause are flushed before this returns.
 * Containers are removed automatically after every test (see test-setup.ts).
 */
export function renderUi(ui: ReactElement): RenderResult {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const entry: Mounted = { root, container, unmounted: false };
  mounted.add(entry);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    root,
    rerender: (next) => {
      act(() => {
        root.render(next);
      });
    },
    unmount: () => {
      if (entry.unmounted) return;
      entry.unmounted = true;
      act(() => {
        root.unmount();
      });
    },
  };
}

/** Unmount and remove everything `renderUi` mounted. Safe to call repeatedly. */
export function cleanupUi(): void {
  for (const entry of mounted) {
    if (!entry.unmounted) {
      entry.unmounted = true;
      act(() => {
        entry.root.unmount();
      });
    }
    entry.container.remove();
  }
  mounted.clear();
}

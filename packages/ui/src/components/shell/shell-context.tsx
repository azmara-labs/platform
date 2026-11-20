import { createContext, type RefObject, useContext } from "react";
import type { SidebarMode } from "./sidebar-state.js";

/** Every piece of text the shell adds itself, so an app can translate it. */
export interface ShellLabels {
  openNav: string;
  closeNav: string;
  skipLink: string;
  /** The accessible name of the navigation drawer on narrow screens. */
  drawerTitle: string;
}

export const DEFAULT_LABELS: ShellLabels = {
  openNav: "Open navigation",
  closeNav: "Close navigation",
  skipLink: "Skip to content",
  drawerTitle: "Navigation",
};

/** What an app can read and drive. Returned by `useAppShell()`. */
export interface AppShellState {
  /** The remembered desktop choice: `pinned` (open, beside the content) or `hidden`. */
  mode: SidebarMode;
  setMode(mode: SidebarMode): void;
  /** A hidden sidebar is showing over the content because of hover or focus. */
  peeking: boolean;
  /** The navigation drawer is open (below the breakpoint). */
  drawerOpen: boolean;
  setDrawerOpen(open: boolean): void;
  /** The viewport is wide enough for the sidebar beside the content. */
  isDesktop: boolean;
}

/** What the shell's own parts need (the top bar's toggle, the drawer). Not public. */
export interface ShellInternals {
  state: AppShellState;
  labels: ShellLabels;
  hasSidebar: boolean;
  sidebarId: string;
  toggleRef: RefObject<HTMLButtonElement | null>;
  /** Pin or unpin on desktop; open or close the drawer below the breakpoint. */
  toggle(): void;
}

export const ShellContext = createContext<ShellInternals | null>(null);

export function useShell(): ShellInternals {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("This component must be rendered inside <AppShell>.");
  return shell;
}

/** The shell's state, for apps that need to read or drive it. Throws outside `AppShell`. */
export function useAppShell(): AppShellState {
  return useShell().state;
}

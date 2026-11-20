import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { inertProps } from "../../motion/presets/collapse.js";
import { Drawer, DrawerContent, DrawerTitle } from "../modal/index.js";
import { BREAKPOINTS, type ShellBreakpoint } from "./breakpoints.js";
import { NavGroup, NavItem } from "./nav.js";
import {
  type AppShellState,
  DEFAULT_LABELS,
  ShellContext,
  type ShellInternals,
  type ShellLabels,
} from "./shell-context.js";
import { Sidebar, SidebarFooter } from "./sidebar.js";
import { type SidebarMode, serializeSidebarMode } from "./sidebar-state.js";
import { TopBar } from "./top-bar.js";
import { useMinWidth } from "./use-min-width.js";
import { usePeek } from "./use-peek.js";

export interface AppShellProps {
  /** An `AppShell.TopBar`. It also holds the button that pins the sidebar or opens the drawer. */
  topBar?: ReactNode;
  /** An `AppShell.Sidebar`. Without one the shell is just a top bar and content. */
  sidebar?: ReactNode;
  children: ReactNode;
  /**
   * The sidebar's starting mode: `pinned` (open beside the content) or `hidden` (peeks on hover).
   * Read it from the cookie on the server with `readSidebarMode` so the first paint is right.
   */
  defaultMode?: SidebarMode;
  /** Remember changes in a cookie (`azmr-sidebar`) so the server can render them. Default true. */
  persist?: boolean;
  /** Below this width the sidebar becomes a drawer. Default `lg`. */
  breakpoint?: ShellBreakpoint;
  /** Replace the shell's built-in English text. */
  labels?: Partial<ShellLabels>;
  /**
   * Use inside a page that already has a `main` landmark, such as a docs demo or a panel: the content
   * and the top bar become plain elements, so the page keeps one `main` and one banner.
   */
  embedded?: boolean;
  className?: string;
}

function writeCookie(mode: SidebarMode): void {
  // biome-ignore lint/suspicious/noDocumentCookie: the string is validated by serializeCookie, and the async Cookie Store API is not universally supported yet
  document.cookie = serializeSidebarMode(mode, { secure: window.location.protocol === "https:" });
}

const SKIP_LINK =
  "sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-(--z-toast) focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:text-sm focus:shadow-elevation-3 focus:outline-none focus:ring-2 focus:ring-ring";

// The strip at the screen's left edge that a hidden sidebar peeks from. Only rendered where a
// pointer can use it.
const EDGE_ZONE =
  "fixed start-0 top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] bottom-0 z-(--z-overlay) w-3";

/**
 * The dashboard frame: a top bar, a side navigation and the content. On wide screens the sidebar is
 * `pinned` beside the content or `hidden`; a hidden one peeks over the content when the mouse rests
 * on the left edge, and the top bar's button pins it for good. Below the breakpoint it is a drawer.
 * Layout is CSS driven by `data-sidebar`, so the server-rendered first paint is already right.
 */
function AppShellRoot({
  topBar,
  sidebar,
  children,
  defaultMode = "pinned",
  persist = true,
  breakpoint = "lg",
  labels,
  embedded = false,
  className,
}: AppShellProps) {
  const bp = BREAKPOINTS[breakpoint];
  const isDesktop = useMinWidth(bp.query);
  const [mode, setModeState] = useState<SidebarMode>(defaultMode);
  const [drawerRequested, setDrawerOpen] = useState(false);
  // The drawer only exists below the breakpoint: growing the window closes it, and it stays closed
  // if the window shrinks again.
  const drawerOpen = drawerRequested && !isDesktop;
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const peek = usePeek({
    enabled: isDesktop && mode === "hidden",
    // Closing the peek makes the panel inert: take focus to the toggle rather than lose it to the page.
    restoreFocus: () => toggleRef.current?.focus(),
  });

  const sidebarId = useId();
  const mainId = useId();
  const asideRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const setMode = useCallback(
    (next: SidebarMode) => {
      // Move focus out before the sidebar becomes inert, or it would be lost to the page.
      if (next === "hidden" && asideRef.current?.contains(document.activeElement)) {
        toggleRef.current?.focus();
      }
      setModeState(next);
      if (persist) writeCookie(next);
    },
    [persist],
  );

  const toggle = useCallback(() => {
    if (isDesktop) setMode(mode === "pinned" ? "hidden" : "pinned");
    else setDrawerOpen((open) => !open);
  }, [isDesktop, mode, setMode]);

  const state = useMemo<AppShellState>(
    () => ({ mode, setMode, peeking: peek.peeking, drawerOpen, setDrawerOpen, isDesktop }),
    [mode, setMode, peek.peeking, drawerOpen, isDesktop],
  );
  const mergedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);
  const internals = useMemo<ShellInternals>(
    () => ({
      state,
      labels: mergedLabels,
      hasSidebar: sidebar != null,
      embedded,
      sidebarId,
      toggleRef,
      toggle,
    }),
    [state, mergedLabels, sidebar, embedded, sidebarId, toggle],
  );

  // Following a link in a peeking sidebar closes it. One native listener covers mouse and keyboard
  // (activating a link with Enter fires `click` too) without a handler on a non-interactive
  // element. A ref callback attaches it whenever the sidebar mounts.
  const closePeek = peek.close;
  const bindAside = useCallback(
    (aside: HTMLDivElement | null) => {
      asideRef.current = aside;
      if (!aside) return;
      const onClick = (event: Event) => {
        if ((event.target as Element).closest("a[href]")) closePeek();
      };
      aside.addEventListener("click", onClick);
      return () => aside.removeEventListener("click", onClick);
    },
    [closePeek],
  );

  // Following a link in the drawer closes it, the same way and for the same reason as the peek.
  const bindDrawer = useCallback((popup: HTMLDivElement | null) => {
    if (!popup) return;
    const onClick = (event: Event) => {
      if ((event.target as Element).closest("a[href]")) setDrawerOpen(false);
    };
    popup.addEventListener("click", onClick);
    return () => popup.removeEventListener("click", onClick);
  }, []);

  const hidden = mode === "hidden";
  const Content = embedded ? "div" : "main";
  return (
    <ShellContext.Provider value={internals}>
      <div
        data-azmr-shell=""
        data-sidebar={mode}
        data-peek={peek.peeking ? "open" : "closed"}
        className={cn(
          "relative grid min-h-(--shell-vh) grid-cols-1 grid-rows-[auto_1fr] bg-background text-foreground [--shell-topbar-h:3.5rem] [--shell-vh:100dvh]",
          sidebar != null && bp.columns[mode],
          className,
        )}
      >
        <a
          href={`#${mainId}`}
          className={SKIP_LINK}
          onClick={(event) => {
            event.preventDefault();
            mainRef.current?.focus();
          }}
        >
          {mergedLabels.skipLink}
        </a>
        {topBar}
        {sidebar != null ? (
          // A plain element, not an `aside`: the labelled `nav` inside is the landmark, and a second
          // complementary landmark around it would only add noise (and trip axe inside a `main`).
          <div
            id={sidebarId}
            ref={bindAside}
            data-peek-panel=""
            {...(hidden && !peek.peeking ? inertProps() : {})}
            {...peek.bindings}
            className={cn(
              "border-sidebar-border border-e bg-sidebar",
              bp.aside.base,
              hidden ? bp.aside.hidden : bp.aside.pinned,
              hidden && (peek.peeking ? bp.aside.open : bp.aside.closed),
            )}
          >
            {sidebar}
          </div>
        ) : null}
        <Content
          id={mainId}
          ref={mainRef}
          data-shell-content=""
          tabIndex={-1}
          className={cn("row-start-2 min-w-0 outline-none", sidebar != null && bp.main)}
        >
          {children}
        </Content>
        {sidebar != null ? (
          <Drawer side="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent
              ref={bindDrawer}
              showClose={false}
              finalFocus={toggleRef}
              className="border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top)] text-sidebar-foreground"
              contentClassName="h-full grid-rows-[minmax(0,1fr)] gap-0"
            >
              <DrawerTitle className="sr-only">{mergedLabels.drawerTitle}</DrawerTitle>
              {sidebar}
            </DrawerContent>
          </Drawer>
        ) : null}
        {sidebar != null && isDesktop && hidden ? (
          <div data-peek-zone="" aria-hidden="true" className={EDGE_ZONE} {...peek.bindings} />
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}

export const AppShell = Object.assign(AppShellRoot, {
  TopBar,
  Sidebar,
  NavGroup,
  NavItem,
  SidebarFooter,
});

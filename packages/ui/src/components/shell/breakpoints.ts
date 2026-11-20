// Generated once from a template and then maintained by hand: Tailwind only finds classes that are
// written out in full, so each breakpoint spells its variants (`md:`, `lg:`, `xl:`) rather than
// building them from a string. Keep the three blocks identical apart from the prefix.
//
// The grid columns are not animated: the design spec (section 6) allows only transform, opacity,
// clip-path and grid-template-rows, because anything else re-lays-out the page on every frame. So
// pinning and unpinning snap the content; the peek overlay still slides, using `translate`.

export type ShellBreakpoint = "md" | "lg" | "xl";

export interface BreakpointClasses {
  /** The media query that means "wide enough for the sidebar beside the content". */
  query: string;
  /** Grid columns on the root, by remembered mode. */
  columns: { pinned: string; hidden: string };
  /** The sidebar `aside`: hidden below the breakpoint, then by mode and by whether it is peeking. */
  aside: { base: string; pinned: string; hidden: string; closed: string; open: string };
  /** Where `main` sits in the grid once the sidebar has a column. */
  main: string;
}

export const BREAKPOINTS: Record<ShellBreakpoint, BreakpointClasses> = {
  md: {
    query: "(min-width: 48rem)",
    columns: {
      pinned: "md:grid-cols-[16rem_minmax(0,1fr)]",
      hidden: "md:grid-cols-[0_minmax(0,1fr)]",
    },
    aside: {
      base: "hidden md:block",
      pinned:
        "md:sticky md:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] md:col-start-1 md:row-start-2 md:h-[calc(100dvh-var(--shell-topbar-h)-env(safe-area-inset-top))]",
      hidden:
        "md:fixed md:start-0 md:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] md:bottom-0 md:z-(--z-overlay) md:w-64 md:transition-[translate] md:duration-(--motion-duration-base) md:ease-standard",
      closed: "md:-translate-x-full",
      open: "md:translate-x-0 md:shadow-elevation-3",
    },
    main: "md:col-start-2",
  },
  lg: {
    query: "(min-width: 64rem)",
    columns: {
      pinned: "lg:grid-cols-[16rem_minmax(0,1fr)]",
      hidden: "lg:grid-cols-[0_minmax(0,1fr)]",
    },
    aside: {
      base: "hidden lg:block",
      pinned:
        "lg:sticky lg:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] lg:col-start-1 lg:row-start-2 lg:h-[calc(100dvh-var(--shell-topbar-h)-env(safe-area-inset-top))]",
      hidden:
        "lg:fixed lg:start-0 lg:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] lg:bottom-0 lg:z-(--z-overlay) lg:w-64 lg:transition-[translate] lg:duration-(--motion-duration-base) lg:ease-standard",
      closed: "lg:-translate-x-full",
      open: "lg:translate-x-0 lg:shadow-elevation-3",
    },
    main: "lg:col-start-2",
  },
  xl: {
    query: "(min-width: 80rem)",
    columns: {
      pinned: "xl:grid-cols-[16rem_minmax(0,1fr)]",
      hidden: "xl:grid-cols-[0_minmax(0,1fr)]",
    },
    aside: {
      base: "hidden xl:block",
      pinned:
        "xl:sticky xl:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] xl:col-start-1 xl:row-start-2 xl:h-[calc(100dvh-var(--shell-topbar-h)-env(safe-area-inset-top))]",
      hidden:
        "xl:fixed xl:start-0 xl:top-[calc(var(--shell-topbar-h)+env(safe-area-inset-top))] xl:bottom-0 xl:z-(--z-overlay) xl:w-64 xl:transition-[translate] xl:duration-(--motion-duration-base) xl:ease-standard",
      closed: "xl:-translate-x-full",
      open: "xl:translate-x-0 xl:shadow-elevation-3",
    },
    main: "xl:col-start-2",
  },
};

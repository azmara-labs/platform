import type { ContainerSize } from "./container.js";
import type { Breakpoint } from "./responsive.js";
import type { Gap } from "./scale.js";

/**
 * How MUI `Grid`, `Stack` and `Container` map to `@azmr/ui` layout components. Pure data and
 * pure functions for the migration codemod, which rewrites what is exact and flags what returns
 * `undefined` or `approximate`. Imports only types.
 */
export const muiLayoutMap = {
  grid: {
    container: "Use <Grid cols={12}>. It is a CSS grid, not MUI's flex-based container.",
    item: "Use <GridItem span={{ base, sm, md, lg, xl }}> with the same numbers.",
    props: {
      spacing: "gap (MUI unit 8px, ours 4px: spacing 2 is gap 4). See muiSpacingToGap.",
      rowSpacing: 'No separate row gap: use gap, or className="gap-y-*".',
      columnSpacing: 'No separate column gap: use gap, or className="gap-x-*".',
      direction: "Not needed: GridItem placement is by column span.",
      alignItems: "align",
      justifyContent: "justify (justifyItems semantics in a grid).",
      columns: "cols (the number of columns, default 12 in MUI).",
      xs: "GridItem span.base",
      sm: "GridItem span.sm",
      md: "GridItem span.md",
      lg: "GridItem span.lg",
      xl: "GridItem span.xl",
    },
  },
  stack: {
    props: {
      spacing: "gap (MUI unit 8px, ours 4px). See muiSpacingToGap.",
      direction: "direction (accepts a responsive object).",
      divider: "divider",
      alignItems: "align",
      justifyContent: "justify",
      useFlexGap: "Not needed: Stack always uses flex gap.",
    },
  },
  container: {
    props: {
      maxWidth: "size (see muiContainerSize).",
      disableGutters: "gutters={false}",
      fixed: "Not supported: use size.",
    },
  },
  breakpoints: {
    xs: "base",
    sm: "sm",
    md: "md",
    lg: "lg",
    xl: "xl",
    note: "MUI breakpoints are 0/600/900/1200/1536px; Tailwind's are 0/640/768/1024/1280px, so layouts shift a little near the boundaries. Check them in the browser.",
  },
} as const;

/** MUI spacing is a multiple of 8px; our gap steps are multiples of 4px. */
const SPACING_TO_GAP = new Map<number, Gap>([
  [0, 0],
  [0.5, 1],
  [1, 2],
  [1.5, 3],
  [2, 4],
  [2.5, 5],
  [3, 6],
  [4, 8],
  [5, 10],
  [6, 12],
]);

/** The gap step for a MUI `spacing` value, or `undefined` when there is no equivalent step. */
export function muiSpacingToGap(spacing: number): Gap | undefined {
  return SPACING_TO_GAP.get(spacing);
}

const MUI_BREAKPOINTS: Record<string, Breakpoint> = {
  xs: "base",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

export function muiBreakpoint(key: string): Breakpoint | undefined {
  return Object.hasOwn(MUI_BREAKPOINTS, key) ? MUI_BREAKPOINTS[key] : undefined;
}

export interface ContainerSizeTarget {
  size: ContainerSize;
  /** True when the width is only close, so the codemod should flag it. */
  approximate?: true;
}

const MUI_CONTAINER: Record<string, ContainerSizeTarget> = {
  xs: { size: "sm", approximate: true },
  sm: { size: "sm" },
  md: { size: "md" },
  lg: { size: "lg" },
  xl: { size: "xl" },
};

/** `maxWidth` of a MUI Container. `undefined` is MUI's default (`lg`); `false` removes the limit. */
export function muiContainerSize(
  maxWidth: "xs" | "sm" | "md" | "lg" | "xl" | false | undefined,
): ContainerSizeTarget | undefined {
  if (maxWidth === false) return { size: "full" };
  const key = maxWidth ?? "lg";
  return Object.hasOwn(MUI_CONTAINER, key) ? MUI_CONTAINER[key] : undefined;
}

type MuiColumns = number | "auto" | boolean;

export interface MuiGridItemSpan {
  /** The responsive span for `GridItem`, or `undefined` when none of the props could be mapped. */
  span: Partial<Record<Breakpoint, number>> | undefined;
  /** Props that have no equivalent (`auto`, `true`, out of range), as `prop=value`, for flagging. */
  unsupported: string[];
}

/** Converts MUI `Grid` item props (`xs`, `sm`, ...) to a `GridItem` span. */
export function muiGridItemSpan(props: {
  xs?: MuiColumns;
  sm?: MuiColumns;
  md?: MuiColumns;
  lg?: MuiColumns;
  xl?: MuiColumns;
}): MuiGridItemSpan {
  const span: Partial<Record<Breakpoint, number>> = {};
  const unsupported: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    const breakpoint = muiBreakpoint(key);
    if (breakpoint === undefined || value === undefined) continue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
      span[breakpoint] = value;
    } else {
      unsupported.push(`${key}=${String(value)}`);
    }
  }
  return { span: Object.keys(span).length > 0 ? span : undefined, unsupported };
}

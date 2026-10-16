export type PageRangeItem = number | "start-ellipsis" | "end-ellipsis";

export interface PageRangeOptions {
  /** The current page, 1-based. Out-of-range values are clamped. */
  page: number;
  /** How many pages there are. */
  pageCount: number;
  /** Pages shown either side of the current one. Default 1. */
  siblingCount?: number;
  /** Pages always shown at each end. Default 1. */
  boundaryCount?: number;
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

/**
 * The page numbers to show for a paginator, with `"start-ellipsis"` and `"end-ellipsis"` where pages
 * are skipped: `[1, "start-ellipsis", 4, 5, 6, "end-ellipsis", 10]`. Pure, so a data grid can reuse it.
 *
 * With the defaults the result is 7 long once there are more than 7 pages, so the control does not
 * change width as you page. A skipped run of exactly one page is shown as that page rather than as an
 * ellipsis, which would save no space.
 */
export function getPageRange({
  page,
  pageCount,
  siblingCount = 1,
  boundaryCount = 1,
}: PageRangeOptions): PageRangeItem[] {
  const count = Math.floor(pageCount);
  if (!(count >= 1)) return [];
  // Out-of-range pages need no clamp: the window arithmetic below already pins them to an end.
  const current = Number.isFinite(page) ? Math.floor(page) : 1;
  const sibling = Math.max(0, Math.floor(siblingCount));
  const boundary = Math.max(0, Math.floor(boundaryCount));

  const startPages = range(1, Math.min(boundary, count));
  const endPages = range(Math.max(count - boundary + 1, boundary + 1), count);

  const siblingsStart = Math.max(
    Math.min(current - sibling, count - boundary - sibling * 2 - 1),
    boundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + sibling, boundary + sibling * 2 + 2),
    endPages.length > 0 ? (endPages[0] as number) - 2 : count - 1,
  );

  const items: (PageRangeItem | null)[] = [
    ...startPages,
    siblingsStart > boundary + 2
      ? "start-ellipsis"
      : boundary + 1 < count - boundary
        ? boundary + 1
        : null,
    ...range(siblingsStart, siblingsEnd),
    siblingsEnd < count - boundary - 1
      ? "end-ellipsis"
      : count - boundary > boundary
        ? count - boundary
        : null,
    ...endPages,
  ];
  return items.filter((item): item is PageRangeItem => item !== null);
}

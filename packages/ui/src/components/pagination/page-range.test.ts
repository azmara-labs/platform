import { describe, expect, it } from "vitest";
import { getPageRange } from "./page-range.js";

const E1 = "start-ellipsis";
const E2 = "end-ellipsis";

describe("getPageRange", () => {
  it.each([
    [1, 10, [1, 2, 3, 4, 5, E2, 10]],
    [2, 10, [1, 2, 3, 4, 5, E2, 10]],
    [4, 10, [1, 2, 3, 4, 5, E2, 10]],
    [5, 10, [1, E1, 4, 5, 6, E2, 10]],
    [6, 10, [1, E1, 5, 6, 7, E2, 10]],
    [7, 10, [1, E1, 6, 7, 8, 9, 10]],
    [10, 10, [1, E1, 6, 7, 8, 9, 10]],
  ])("page %s of %s", (page, count, expected) => {
    expect(getPageRange({ page, pageCount: count })).toEqual(expected);
  });

  it("shows every page when there are few", () => {
    for (const count of [1, 2, 3, 5, 7]) {
      expect(getPageRange({ page: 1, pageCount: count })).toEqual(
        Array.from({ length: count }, (_, i) => i + 1),
      );
    }
  });

  it("is empty for no pages", () => {
    expect(getPageRange({ page: 1, pageCount: 0 })).toEqual([]);
    expect(getPageRange({ page: 1, pageCount: -3 })).toEqual([]);
  });

  it("clamps a page that is out of range", () => {
    expect(getPageRange({ page: 0, pageCount: 10 })).toEqual(
      getPageRange({ page: 1, pageCount: 10 }),
    );
    expect(getPageRange({ page: 99, pageCount: 10 })).toEqual(
      getPageRange({ page: 10, pageCount: 10 }),
    );
    expect(getPageRange({ page: Number.NaN, pageCount: 10 })).toEqual(
      getPageRange({ page: 1, pageCount: 10 }),
    );
  });

  it("more siblings widen the window", () => {
    expect(getPageRange({ page: 10, pageCount: 20, siblingCount: 2 })).toEqual([
      1,
      E1,
      8,
      9,
      10,
      11,
      12,
      E2,
      20,
    ]);
  });

  it("more boundary pages keep more of the ends", () => {
    expect(getPageRange({ page: 10, pageCount: 20, boundaryCount: 2 })).toEqual([
      1,
      2,
      E1,
      9,
      10,
      11,
      E2,
      19,
      20,
    ]);
  });

  it("no siblings and no boundary is just the current page between ellipses", () => {
    expect(getPageRange({ page: 5, pageCount: 10, siblingCount: 0, boundaryCount: 0 })).toEqual([
      E1,
      5,
      E2,
    ]);
  });

  it("never replaces a single hidden page with an ellipsis (it shows the page instead)", () => {
    // Page 4 of 8: pages 1..5 then 8; showing "..." for just page 6 or 7 would save no space.
    expect(getPageRange({ page: 3, pageCount: 8 })).toEqual([1, 2, 3, 4, 5, E2, 8]);
    expect(getPageRange({ page: 6, pageCount: 8 })).toEqual([1, E1, 4, 5, 6, 7, 8]);
  });

  it("keeps a stable length while paging, so the control does not jump", () => {
    const lengths = new Set<number>();
    for (let page = 1; page <= 30; page++)
      lengths.add(getPageRange({ page, pageCount: 30 }).length);
    expect([...lengths]).toEqual([7]);
  });

  it("always contains the current page, the first and the last, in ascending order, without repeats", () => {
    for (const count of [8, 9, 12, 30, 101]) {
      for (let page = 1; page <= count; page++) {
        const range = getPageRange({ page, pageCount: count });
        const numbers = range.filter((x): x is number => typeof x === "number");
        expect(numbers, `${page}/${count}`).toContain(page);
        expect(numbers[0]).toBe(1);
        expect(numbers[numbers.length - 1]).toBe(count);
        expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b));
      }
    }
  });
});

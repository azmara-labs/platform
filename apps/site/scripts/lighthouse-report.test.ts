import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluate,
  format,
  median,
  meets,
  summarise,
  table,
  validateBudgets,
} from "./lighthouse-report.mjs";

const siteDir = join(import.meta.dirname, "..");

describe("median", () => {
  it("is the middle value, whatever the order", () => {
    expect(median([75, 96, 96])).toBe(96);
    expect(median([5213, 6974, 4219])).toBe(5213);
  });

  it("is the mean of the two middle values for an even count", () => {
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it("does not change what it was given", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });

  it("refuses nothing", () => {
    expect(() => median([])).toThrow(/nothing/);
  });
});

describe("summarise", () => {
  it("takes the median of each metric across runs, so one bad run does not decide", () => {
    const summary = summarise([
      { performance: 75, lcpMs: 3986, cls: 0 },
      { performance: 96, lcpMs: 2549, cls: 0 },
      { performance: 96, lcpMs: 2689, cls: 0.02 },
    ]);
    expect(summary).toEqual({ performance: 96, lcpMs: 2689, cls: 0 });
  });

  it("leaves out a metric no run reported", () => {
    expect(summarise([{ performance: 90 }])).toEqual({ performance: 90 });
  });
});

describe("meets", () => {
  it("reads scores as higher is better and times and shifts as lower is better", () => {
    expect(meets("performance", 96, 96)).toBe(true);
    expect(meets("performance", 95, 96)).toBe(false);
    expect(meets("lcpMs", 2500, 2500)).toBe(true);
    expect(meets("lcpMs", 2501, 2500)).toBe(false);
    expect(meets("cls", 0.05, 0.1)).toBe(true);
  });
});

describe("evaluate", () => {
  const budget = {
    path: "/x",
    targets: { performance: 96, lcpMs: 2500 },
    limits: { performance: 70, lcpMs: 6000 },
  };

  it("says a page meets its target when it does", () => {
    const { rows, failed } = evaluate({ performance: 98, lcpMs: 2000 }, budget);
    expect(rows.map((r) => r.status)).toEqual(["meets the target", "meets the target"]);
    expect(failed).toEqual([]);
  });

  it("reports a missed target inside the limit without failing", () => {
    const { rows, failed } = evaluate({ performance: 78, lcpMs: 5200 }, budget);
    expect(rows.map((r) => r.status)).toEqual([
      "below the target, within the limit",
      "below the target, within the limit",
    ]);
    expect(failed).toEqual([]);
  });

  it("fails a page past its limit, naming the metric", () => {
    const { failed } = evaluate({ performance: 65, lcpMs: 5200 }, budget);
    expect(failed.map((r) => r.metric)).toEqual(["performance"]);
  });

  it("fails a time that is past its limit", () => {
    const { failed } = evaluate({ performance: 90, lcpMs: 6500 }, budget);
    expect(failed.map((r) => r.metric)).toEqual(["lcpMs"]);
  });

  it("only reports, and never fails, a metric with no limit", () => {
    const { rows, failed } = evaluate(
      { performance: 10 },
      { path: "/x", targets: { performance: 96 }, limits: {} },
    );
    expect(rows[0]?.status).toBe("below the target, no limit set");
    expect(failed).toEqual([]);
  });

  it("skips a metric with neither a target nor a limit, or no result", () => {
    const { rows } = evaluate(
      { performance: 90, seo: 100 },
      { path: "/x", targets: { performance: 96 }, limits: {} },
    );
    expect(rows.map((r) => r.metric)).toEqual(["performance"]);
  });
});

describe("format and table", () => {
  it("writes scores whole, times in ms and layout shift to three places", () => {
    expect(format("performance", 95.6)).toBe("96");
    expect(format("lcpMs", 2688.7)).toBe("2689 ms");
    expect(format("cls", 0.0123)).toBe("0.012");
  });

  it("writes a Markdown table with the target, the limit and the status", () => {
    const budget = { path: "/x", targets: { performance: 96 }, limits: { performance: 70 } };
    const text = table("/x", 3, evaluate({ performance: 78 }, budget));
    expect(text).toContain("### /x");
    expect(text).toContain("Median of 3 runs");
    expect(text).toContain("| Performance | 78 | 96 | 70 | below the target, within the limit |");
  });
});

describe("validateBudgets", () => {
  const ok = {
    runs: 3,
    pages: [{ path: "/", targets: { performance: 96 }, limits: { performance: 60 } }],
  };

  it("accepts a good file", () => {
    expect(validateBudgets(ok).pages).toHaveLength(1);
  });

  it.each([
    [{ ...ok, runs: 0 }, /runs/],
    [{ ...ok, pages: [] }, /pages/],
    [{ ...ok, pages: [{ path: "docs", targets: {}, limits: {} }] }, /path/],
    [{ ...ok, pages: [{ path: "/", targets: { speed: 1 }, limits: {} }] }, /unknown metric/],
    [
      { ...ok, pages: [{ path: "/", targets: { performance: "96" }, limits: {} }] },
      /must be a number/,
    ],
    [
      { ...ok, pages: [{ path: "/", targets: { performance: 96 }, limits: { performance: 99 } }] },
      /stricter than its target/,
    ],
    [
      { ...ok, pages: [{ path: "/", targets: { lcpMs: 2500 }, limits: { lcpMs: 2000 } }] },
      /stricter than its target/,
    ],
  ])("rejects %j", (bad, message) => {
    expect(() => validateBudgets(bad)).toThrow(message);
  });
});

describe("the real budgets and the job that uses them", () => {
  const raw = JSON.parse(readFileSync(join(siteDir, "lighthouse-budgets.json"), "utf8"));
  const budgets = validateBudgets(raw);
  const ci = readFileSync(join(siteDir, "..", "..", ".github", "workflows", "ci.yml"), "utf8");
  const pkg = JSON.parse(readFileSync(join(siteDir, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("are valid, and cover the landing page and a heavy component page", () => {
    expect(budgets.pages.map((p) => p.path)).toEqual(["/", "/docs/components/menu"]);
  });

  it("carry the project's targets: 96 on every score, FCP under 1.5 s, LCP under 2.5 s, CLS under 0.1", () => {
    for (const page of budgets.pages) {
      expect(page.targets).toMatchObject({
        performance: 96,
        accessibility: 96,
        bestPractices: 96,
        seo: 96,
        fcpMs: 1500,
        lcpMs: 2500,
        cls: 0.1,
      });
    }
  });

  it("run in CI against the built site, and keep the results", () => {
    expect(pkg.scripts["check:lighthouse"]).toContain("lighthouse-pages.mjs");
    expect(ci).toContain("check:lighthouse");
    expect(ci).toContain("lighthouse-results.json");
  });
});

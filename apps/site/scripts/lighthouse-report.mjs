// The arithmetic and the report behind the Lighthouse check (lighthouse-pages.mjs): medians of
// several runs, a comparison with each page's targets and limits, and a Markdown table.
//
// Two numbers per metric, because they answer two questions:
//   target  what the project standards ask for (Lighthouse 96+, FCP < 1.5 s, LCP < 2.5 s, CLS < 0.1).
//   limit   the worst we accept for now. A page past its limit has got worse, and the check fails.
// A page that misses a target but is inside its limit is reported, not failed, so the check tells the
// truth about the gap without failing every pull request until the gap is closed. A limit is only
// ever tightened as the page improves.

/**
 * @typedef {"performance" | "accessibility" | "bestPractices" | "seo" | "fcpMs" | "lcpMs" | "cls" | "tbtMs"} Metric
 * @typedef {Partial<Record<Metric, number>>} Numbers
 * @typedef {{ path: string, targets: Numbers, limits: Numbers }} PageBudget
 */

/** How each metric is read: its label, unit, and whether a higher number is better. */
export const METRICS = {
  performance: { label: "Performance", unit: "", higherIsBetter: true },
  accessibility: { label: "Accessibility", unit: "", higherIsBetter: true },
  bestPractices: { label: "Best practices", unit: "", higherIsBetter: true },
  seo: { label: "SEO", unit: "", higherIsBetter: true },
  fcpMs: { label: "First Contentful Paint", unit: " ms", higherIsBetter: false },
  lcpMs: { label: "Largest Contentful Paint", unit: " ms", higherIsBetter: false },
  cls: { label: "Cumulative Layout Shift", unit: "", higherIsBetter: false },
  tbtMs: { label: "Total Blocking Time", unit: " ms", higherIsBetter: false },
};

/** The middle value, or the mean of the two middle values for an even count. */
export function median(values) {
  if (values.length === 0) throw new Error("median of nothing");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The median of each metric over several runs. */
export function summarise(runs) {
  if (runs.length === 0) throw new Error("no runs to summarise");
  /** @type {Numbers} */
  const out = {};
  for (const metric of Object.keys(METRICS)) {
    const values = runs.map((run) => run[metric]).filter((v) => typeof v === "number");
    if (values.length > 0) out[metric] = median(values);
  }
  return out;
}

/** True when `value` is on the good side of `bound` for this metric. */
export function meets(metric, value, bound) {
  return METRICS[metric].higherIsBetter ? value >= bound : value <= bound;
}

/**
 * @param {Numbers} summary
 * @param {PageBudget} budget
 */
export function evaluate(summary, budget) {
  const rows = [];
  for (const metric of Object.keys(METRICS)) {
    const value = summary[metric];
    const target = budget.targets[metric];
    const limit = budget.limits[metric];
    if (value === undefined || (target === undefined && limit === undefined)) continue;
    let status = "meets the target";
    if (limit !== undefined && !meets(metric, value, limit)) status = "past the limit";
    else if (target !== undefined && !meets(metric, value, target)) {
      status =
        limit === undefined
          ? "below the target, no limit set"
          : "below the target, within the limit";
    }
    rows.push({ metric, value, target, limit, status });
  }
  return { rows, failed: rows.filter((row) => row.status === "past the limit") };
}

/** A number as people read it: scores whole, times in ms, layout shift to three places. */
export function format(metric, value) {
  const { unit } = METRICS[metric];
  if (metric === "cls") return value.toFixed(3);
  return `${Math.round(value)}${unit}`;
}

/** A Markdown table for one page, for the job summary. */
export function table(page, runs, evaluation) {
  const lines = [
    `### ${page}`,
    "",
    `Median of ${runs} runs, mobile profile.`,
    "",
    "| Metric | Result | Target | Limit | Status |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of evaluation.rows) {
    lines.push(
      `| ${METRICS[row.metric].label} | ${format(row.metric, row.value)} | ${
        row.target === undefined ? "none" : format(row.metric, row.target)
      } | ${row.limit === undefined ? "none" : format(row.metric, row.limit)} | ${row.status} |`,
    );
  }
  return lines.join("\n");
}

/** Checks the budgets file: every page has a path, and every number is a finite number. */
export function validateBudgets(file) {
  if (!file || typeof file !== "object") throw new Error("the budgets file must be an object");
  if (!Number.isInteger(file.runs) || file.runs < 1)
    throw new Error("runs must be a whole number of 1 or more");
  if (!Array.isArray(file.pages) || file.pages.length === 0)
    throw new Error("pages must be a list");
  for (const page of file.pages) {
    if (typeof page.path !== "string" || !page.path.startsWith("/")) {
      throw new Error(`a page has no path starting with "/": ${JSON.stringify(page.path)}`);
    }
    for (const kind of ["targets", "limits"]) {
      for (const [metric, value] of Object.entries(page[kind] ?? {})) {
        if (!(metric in METRICS))
          throw new Error(`${page.path} ${kind}: unknown metric "${metric}"`);
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`${page.path} ${kind}.${metric} must be a number`);
        }
      }
    }
    // A limit looser than the target is the point; a limit tighter than the target would fail a page
    // that meets its target.
    for (const [metric, limit] of Object.entries(page.limits ?? {})) {
      const target = page.targets?.[metric];
      if (target !== undefined && meets(metric, limit, target) && limit !== target) {
        throw new Error(
          `${page.path}: the ${metric} limit (${limit}) is stricter than its target (${target})`,
        );
      }
    }
  }
  return {
    runs: file.runs,
    pages: file.pages.map((p) => ({
      path: p.path,
      targets: p.targets ?? {},
      limits: p.limits ?? {},
    })),
  };
}

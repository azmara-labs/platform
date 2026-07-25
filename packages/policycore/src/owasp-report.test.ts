import { describe, expect, it } from "vitest";
import type { AggregatedFinding, AnalyzerResultLike } from "./owasp-report.js";
import {
  flattenAnalyzerResults,
  formatOwaspReportJson,
  formatOwaspReportMarkdown,
  generateOwaspReport,
} from "./owasp-report.js";

describe("generateOwaspReport — empty input", () => {
  it("produces a report with zero counts and honest not-evaluated/no-findings language", () => {
    const report = generateOwaspReport([]);
    expect(report.summary.totalFindings).toBe(0);
    expect(report.categories).toHaveLength(10);

    const notEvaluated = report.categories.filter((c) => c.status === "not-evaluated");
    const noFindings = report.categories.filter((c) => c.status === "no-findings");
    const findingsPresent = report.categories.filter((c) => c.status === "findings-present");

    expect(notEvaluated).toHaveLength(6);
    expect(noFindings).toHaveLength(4);
    expect(findingsPresent).toHaveLength(0);

    expect(report.disclaimer.join(" ")).toContain("not evidence of absence");
  });
});

describe("generateOwaspReport — bucketing", () => {
  it("buckets mapped rules into their documented category", () => {
    const findings: AggregatedFinding[] = [
      { file: "a.ts", rule: "no-eval", severity: "error", message: "eval used" },
      { file: "b.ts", rule: "no-sql-concat", severity: "error", message: "sql concat" },
      {
        file: "c.ts",
        rule: "raw-select-with-user-input",
        severity: "warning",
        message: "raw select",
      },
      {
        file: "d.ts",
        rule: "no-unguarded-file-access",
        severity: "error",
        message: "unguarded fs",
      },
      { file: "e.ts", rule: "missing-env-validation", severity: "info", message: "env missing" },
      { file: "f.ts", rule: "audit-log-pii", severity: "warning", message: "pii logged" },
      {
        file: "g.ts",
        rule: "cors-wildcard-with-credentials",
        severity: "error",
        message: "cors misconfig",
      },
    ];
    const report = generateOwaspReport(findings);

    const byCategory = Object.fromEntries(report.categories.map((c) => [c.category, c]));
    expect(byCategory["A03:2021-Injection"]?.findingCount).toBe(3);
    expect(byCategory["A05:2021-Security-Misconfiguration"]?.findingCount).toBe(2); // missing-env-validation + cors-wildcard-with-credentials
    expect(byCategory["A03:2021-Injection"]?.status).toBe("findings-present");
    expect(byCategory["A01:2021-Broken-Access-Control"]?.findingCount).toBe(1);
    expect(byCategory["A09:2021-Security-Logging-and-Monitoring-Failures"]?.findingCount).toBe(1);

    // Uncovered categories stay not-evaluated
    expect(byCategory["A02:2021-Cryptographic-Failures"]?.status).toBe("not-evaluated");
  });
});

describe("generateOwaspReport — unmappable rule", () => {
  it("routes an unknown rule to Uncategorized without throwing or dropping it", () => {
    const findings: AggregatedFinding[] = [
      { file: "x.ts", rule: "totally-made-up-rule", severity: "warning", message: "mystery" },
    ];
    const report = generateOwaspReport(findings);
    expect(report.uncategorized.findingCount).toBe(1);
    expect(report.summary.uncategorizedFindingCount).toBe(1);
    for (const cat of report.categories) {
      expect(cat.findings.some((f) => f.rule === "totally-made-up-rule")).toBe(false);
    }
  });

  it("categoryOverrides moves a rule out of Uncategorized", () => {
    const findings: AggregatedFinding[] = [
      { file: "x.ts", rule: "totally-made-up-rule", severity: "warning", message: "mystery" },
    ];
    const report = generateOwaspReport(findings, {
      categoryOverrides: {
        "totally-made-up-rule": "A08:2021-Software-and-Data-Integrity-Failures",
      },
    });
    expect(report.uncategorized.findingCount).toBe(0);
    const a08 = report.categories.find(
      (c) => c.category === "A08:2021-Software-and-Data-Integrity-Failures",
    );
    expect(a08?.findingCount).toBe(1);
  });
});

describe("formatOwaspReportMarkdown", () => {
  it("renders without error, contains the disclaimer and all 10 category labels", () => {
    const report = generateOwaspReport([
      { file: "a.ts", rule: "no-eval", severity: "error", message: "eval used" },
    ]);
    const md = formatOwaspReportMarkdown(report);
    expect(md).toContain("does not constitute a security audit");
    expect(md).toContain("A01:2021 – Broken Access Control");
    expect(md).toContain("A10:2021 – Server-Side Request Forgery (SSRF)");
  });

  it("does not use a pass-looking checkmark next to a No Findings row", () => {
    const report = generateOwaspReport([]);
    const md = formatOwaspReportMarkdown(report);
    // The table row for a no-findings category should say the words, not a checkmark glyph
    expect(md).toContain("No Findings");
    expect(md).not.toMatch(/✓.*No Findings|No Findings.*✓/);
  });
});

describe("formatOwaspReportJson", () => {
  it("round-trips through JSON.parse", () => {
    const report = generateOwaspReport([
      { file: "a.ts", rule: "no-eval", severity: "error", message: "eval used" },
    ]);
    const parsed = JSON.parse(formatOwaspReportJson(report));
    expect(parsed).toEqual(report);
  });
});

describe("generateOwaspReport — arithmetic correctness", () => {
  it("severity totals sum correctly across categories and uncategorized", () => {
    const findings: AggregatedFinding[] = [
      { file: "a.ts", rule: "no-eval", severity: "error", message: "m1" },
      { file: "a.ts", rule: "no-eval", severity: "error", message: "m2" },
      { file: "a.ts", rule: "no-eval", severity: "warning", message: "m3" },
      { file: "b.ts", rule: "missing-env-validation", severity: "info", message: "m4" },
    ];
    const report = generateOwaspReport(findings);
    expect(report.summary.totalFindings).toBe(4);
    expect(report.summary.bySeverity).toEqual({ error: 2, warning: 1, info: 1 });

    const a03 = report.categories.find((c) => c.category === "A03:2021-Injection");
    expect(a03?.bySeverity).toEqual({ error: 2, warning: 1, info: 0 });
    const a05 = report.categories.find((c) => c.category === "A05:2021-Security-Misconfiguration");
    expect(a05?.bySeverity.info).toBe(1);

    const summedFromCategories = report.categories.reduce(
      (sum, c) => sum + c.findingCount,
      report.uncategorized.findingCount,
    );
    expect(summedFromCategories).toBe(report.summary.totalFindings);
  });
});

describe("flattenAnalyzerResults", () => {
  it("copies filePath onto every finding and matches manual construction", () => {
    const results: AnalyzerResultLike[] = [
      {
        filePath: "a.ts",
        findings: [
          { rule: "no-eval", severity: "error", message: "m1", line: 5 },
          { rule: "missing-env-validation", severity: "info", message: "m2" },
        ],
      },
      {
        filePath: "b.ts",
        findings: [{ rule: "no-sql-concat", severity: "error", message: "m3" }],
      },
    ];
    const flattened = flattenAnalyzerResults(results);
    expect(flattened).toEqual([
      { file: "a.ts", rule: "no-eval", severity: "error", message: "m1", line: 5 },
      {
        file: "a.ts",
        rule: "missing-env-validation",
        severity: "info",
        message: "m2",
        line: undefined,
      },
      { file: "b.ts", rule: "no-sql-concat", severity: "error", message: "m3", line: undefined },
    ]);

    const reportFromFlattened = generateOwaspReport(flattened);
    const reportFromManual = generateOwaspReport([
      { file: "a.ts", rule: "no-eval", severity: "error", message: "m1", line: 5 },
      { file: "a.ts", rule: "missing-env-validation", severity: "info", message: "m2" },
      { file: "b.ts", rule: "no-sql-concat", severity: "error", message: "m3" },
    ]);
    expect(reportFromFlattened.summary).toEqual(reportFromManual.summary);
  });
});

describe("generateOwaspReport — configSignals", () => {
  it("passes configSignals through and renders a section for them", () => {
    const report = generateOwaspReport([], {
      configSignals: [
        {
          id: "cors-policy-scoped",
          description: "CORS policy does not combine allowCredentials with a wildcard origin",
          category: "A05:2021-Security-Misconfiguration",
          passed: true,
        },
      ],
    });
    expect(report.configSignals).toHaveLength(1);
    const md = formatOwaspReportMarkdown(report);
    expect(md).toContain("Policycore Configuration Signals");
    expect(md).toContain("cors-policy-scoped");
  });

  it("omits configSignals and its section when not supplied", () => {
    const report = generateOwaspReport([]);
    expect(report.configSignals).toBeUndefined();
    expect(formatOwaspReportMarkdown(report)).not.toContain("Policycore Configuration Signals");
  });
});

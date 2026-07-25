/**
 * OWASP Top 10 (2021) compliance report generation.
 *
 * Pure — no filesystem, no CLI/process concerns, no dependency on @azmr/ai
 * (structurally decoupled via AnalyzerResultLike so this module can accept
 * findings from that package, or anywhere else, without importing it).
 *
 * The honesty mechanism this module is built around: coverage is tracked
 * independently of any single report run's findings. Each of the 10
 * categories gets one of three states —
 *   - "not-evaluated": no rule this analyzer runs even attempts to detect
 *     this category. Absence of findings here is absence of evidence, not
 *     evidence of absence.
 *   - "no-findings": at least one rule targets this category, and none
 *     fired this run. Not a guarantee of security — only that these
 *     specific checks did not trigger.
 *   - "findings-present": self-explanatory.
 * Given today's default mapping only covers 4 of the 10 categories, a
 * report against a totally clean codebase will show 6 categories as
 * "not-evaluated" and at best 4 as "no-findings" — never all-green in a
 * way that could be misread as certification. That's intentional.
 */

export type OwaspFindingSeverity = "error" | "warning" | "info";

/** The contract this module expects from any caller — the CLI scan command, or any other findings source. */
export interface AggregatedFinding {
  /** File path the finding applies to (relative or absolute — this module never touches the filesystem). */
  file: string;
  line?: number;
  severity: OwaspFindingSeverity;
  message: string;
  /** Rule identifier the finding was raised under, e.g. "no-eval". The join key used to bucket findings into OWASP categories. */
  rule: string;
}

/**
 * Structural echo of @azmr/ai's AnalysisResult — intentionally not imported
 * from @azmr/ai (keeps policycore dependency-free of the ai package). Any
 * object matching this shape works, from @azmr/ai or elsewhere.
 */
export interface AnalyzerResultLike {
  filePath: string;
  findings: Array<{
    rule: string;
    severity: OwaspFindingSeverity;
    message: string;
    line?: number;
  }>;
}

/** Flattens per-file analyzer results into the flat AggregatedFinding[] shape generateOwaspReport expects. */
export function flattenAnalyzerResults(results: AnalyzerResultLike[]): AggregatedFinding[] {
  return results.flatMap((result) =>
    result.findings.map((f) => ({
      file: result.filePath,
      line: f.line,
      severity: f.severity,
      message: f.message,
      rule: f.rule,
    })),
  );
}

export type OwaspCategory =
  | "A01:2021-Broken-Access-Control"
  | "A02:2021-Cryptographic-Failures"
  | "A03:2021-Injection"
  | "A04:2021-Insecure-Design"
  | "A05:2021-Security-Misconfiguration"
  | "A06:2021-Vulnerable-and-Outdated-Components"
  | "A07:2021-Identification-and-Authentication-Failures"
  | "A08:2021-Software-and-Data-Integrity-Failures"
  | "A09:2021-Security-Logging-and-Monitoring-Failures"
  | "A10:2021-Server-Side-Request-Forgery-SSRF";

export const OWASP_CATEGORIES: OwaspCategory[] = [
  "A01:2021-Broken-Access-Control",
  "A02:2021-Cryptographic-Failures",
  "A03:2021-Injection",
  "A04:2021-Insecure-Design",
  "A05:2021-Security-Misconfiguration",
  "A06:2021-Vulnerable-and-Outdated-Components",
  "A07:2021-Identification-and-Authentication-Failures",
  "A08:2021-Software-and-Data-Integrity-Failures",
  "A09:2021-Security-Logging-and-Monitoring-Failures",
  "A10:2021-Server-Side-Request-Forgery-SSRF",
];

export const OWASP_CATEGORY_LABELS: Record<OwaspCategory, string> = {
  "A01:2021-Broken-Access-Control": "A01:2021 – Broken Access Control",
  "A02:2021-Cryptographic-Failures": "A02:2021 – Cryptographic Failures",
  "A03:2021-Injection": "A03:2021 – Injection",
  "A04:2021-Insecure-Design": "A04:2021 – Insecure Design",
  "A05:2021-Security-Misconfiguration": "A05:2021 – Security Misconfiguration",
  "A06:2021-Vulnerable-and-Outdated-Components": "A06:2021 – Vulnerable and Outdated Components",
  "A07:2021-Identification-and-Authentication-Failures":
    "A07:2021 – Identification and Authentication Failures",
  "A08:2021-Software-and-Data-Integrity-Failures":
    "A08:2021 – Software and Data Integrity Failures",
  "A09:2021-Security-Logging-and-Monitoring-Failures":
    "A09:2021 – Security Logging and Monitoring Failures",
  "A10:2021-Server-Side-Request-Forgery-SSRF": "A10:2021 – Server-Side Request Forgery (SSRF)",
};

/**
 * Exact match on `rule` only — deliberately no regex/fuzzy matching against
 * `message`. A compliance artifact's category assignment must be
 * deterministic and auditable by a human reading this file; a fuzzy
 * heuristic mapper would let the report claim "no injection findings"
 * while silently misfiling an actual injection finding under the wrong
 * bucket, or matching too broadly on unrelated text — worse than "not yet
 * mapped."
 */
export const DEFAULT_RULE_CATEGORY_MAP: Record<string, OwaspCategory> = {
  "no-eval": "A03:2021-Injection",
  "no-sql-concat": "A03:2021-Injection",
  "no-dangerously-set-inner-html": "A03:2021-Injection", // OWASP 2021 folds XSS into Injection
  "raw-select-with-user-input": "A03:2021-Injection",
  "no-unguarded-file-access": "A01:2021-Broken-Access-Control", // path traversal, CWE-22, moved into A01 in the 2021 revision
  "missing-env-validation": "A05:2021-Security-Misconfiguration",
  "cors-wildcard-with-credentials": "A05:2021-Security-Misconfiguration", // this package's own scan.ts rule
  "audit-log-pii": "A09:2021-Security-Logging-and-Monitoring-Failures", // CWE-532
  // Deliberately NOT mapped — Azmara-primitive correctness rules, not
  // OWASP-Top-10-shaped security findings. They fall into "Uncategorized":
  // "effect-missing-disposer", "signal-mutation-in-computed",
  // "query-predicate-must-be-function"
};

export function mapRuleToCategory(
  rule: string,
  overrides?: Record<string, OwaspCategory>,
): OwaspCategory | "Uncategorized" {
  return overrides?.[rule] ?? DEFAULT_RULE_CATEGORY_MAP[rule] ?? "Uncategorized";
}

/** Caller-supplied, v1 opt-in — see the module doc comment / README for why auto-detection isn't built yet. */
export interface ConfigComplianceSignal {
  id: string;
  description: string;
  category: OwaspCategory;
  passed: boolean;
}

function zeroSeverityCounts(): Record<OwaspFindingSeverity, number> {
  return { error: 0, warning: 0, info: 0 };
}

export interface OwaspCategorySummary {
  category: OwaspCategory;
  label: string;
  status: "not-evaluated" | "no-findings" | "findings-present";
  mappedRuleCount: number;
  findingCount: number;
  bySeverity: Record<OwaspFindingSeverity, number>;
  findings: AggregatedFinding[];
}

export interface OwaspReportSummary {
  totalFindings: number;
  bySeverity: Record<OwaspFindingSeverity, number>;
  categoriesWithFindings: number;
  categoriesNotEvaluated: number;
  categoriesNoFindings: number;
  uncategorizedFindingCount: number;
}

export interface OwaspReport {
  generatedAt: string;
  toolVersion: string;
  input: {
    totalFindings: number;
    totalFilesScanned?: number;
  };
  categories: OwaspCategorySummary[];
  uncategorized: { findingCount: number; findings: AggregatedFinding[] };
  summary: OwaspReportSummary;
  configSignals?: ConfigComplianceSignal[];
  disclaimer: string[];
}

const DEFAULT_TOOL_VERSION = "azmr/policycore-owasp-report@1";

const DISCLAIMER: string[] = [
  "This report is generated from automated static-analysis findings and does not " +
    "constitute a security audit, a penetration test, or a certification of " +
    "compliance with the OWASP Top 10 (2021).",
  'A category marked "Not Evaluated" means no rule in this analysis run checks ' +
    "for that category at all — the absence of findings there is an absence of " +
    'evidence, not evidence of absence. A category marked "No Findings" means the ' +
    "specific patterns this tool's rules look for were not found in the scanned " +
    "code — it does not mean the category is free of risk, only that these " +
    "particular checks did not trigger.",
  "This tool performs static pattern-matching on source code. It does not: " +
    "test the running application, its infrastructure, or its network exposure; " +
    "verify third-party dependency vulnerabilities (relevant to A06:2021); " +
    "verify authentication, session, or cryptographic implementation correctness " +
    "beyond the specific patterns its rules check for; inspect runtime " +
    "configuration except where explicitly supplied as a policycore configuration " +
    "signal, which reflects only what a project has declared to @azmr/policycore, " +
    "not what is actually deployed.",
  "A report with zero findings across every category is not a guarantee of " +
    "security and should not be presented as one. This report is intended as one " +
    "input among several — alongside manual code review, dependency scanning, and " +
    "independent security testing — for organizations building an audit trail of " +
    "their security practices.",
];

export interface GenerateOwaspReportOptions {
  toolVersion?: string;
  totalFilesScanned?: number;
  categoryOverrides?: Record<string, OwaspCategory>;
  configSignals?: ConfigComplianceSignal[];
  /** For deterministic tests; defaults to new Date(). */
  generatedAt?: Date;
}

export function generateOwaspReport(
  findings: AggregatedFinding[],
  options: GenerateOwaspReportOptions = {},
): OwaspReport {
  const overrides = options.categoryOverrides;

  const mappedRuleCounts: Record<OwaspCategory, number> = OWASP_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0;
      return acc;
    },
    {} as Record<OwaspCategory, number>,
  );
  const allMappedRules = new Set([
    ...Object.keys(DEFAULT_RULE_CATEGORY_MAP),
    ...Object.keys(overrides ?? {}),
  ]);
  for (const rule of allMappedRules) {
    const category = mapRuleToCategory(rule, overrides);
    if (category !== "Uncategorized") mappedRuleCounts[category]++;
  }

  const categoryBuckets: Record<OwaspCategory, AggregatedFinding[]> = OWASP_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as Record<OwaspCategory, AggregatedFinding[]>,
  );
  const uncategorizedFindings: AggregatedFinding[] = [];

  for (const finding of findings) {
    const category = mapRuleToCategory(finding.rule, overrides);
    if (category === "Uncategorized") {
      uncategorizedFindings.push(finding);
    } else {
      categoryBuckets[category].push(finding);
    }
  }

  const categories: OwaspCategorySummary[] = OWASP_CATEGORIES.map((category) => {
    const categoryFindings = categoryBuckets[category];
    const bySeverity = zeroSeverityCounts();
    for (const f of categoryFindings) bySeverity[f.severity]++;
    const mappedRuleCount = mappedRuleCounts[category];

    let status: OwaspCategorySummary["status"];
    if (categoryFindings.length > 0) status = "findings-present";
    else if (mappedRuleCount > 0) status = "no-findings";
    else status = "not-evaluated";

    return {
      category,
      label: OWASP_CATEGORY_LABELS[category],
      status,
      mappedRuleCount,
      findingCount: categoryFindings.length,
      bySeverity,
      findings: categoryFindings,
    };
  });

  const overallBySeverity = zeroSeverityCounts();
  for (const f of findings) overallBySeverity[f.severity]++;

  const summary: OwaspReportSummary = {
    totalFindings: findings.length,
    bySeverity: overallBySeverity,
    categoriesWithFindings: categories.filter((c) => c.status === "findings-present").length,
    categoriesNotEvaluated: categories.filter((c) => c.status === "not-evaluated").length,
    categoriesNoFindings: categories.filter((c) => c.status === "no-findings").length,
    uncategorizedFindingCount: uncategorizedFindings.length,
  };

  return {
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    toolVersion: options.toolVersion ?? DEFAULT_TOOL_VERSION,
    input: { totalFindings: findings.length, totalFilesScanned: options.totalFilesScanned },
    categories,
    uncategorized: { findingCount: uncategorizedFindings.length, findings: uncategorizedFindings },
    summary,
    configSignals: options.configSignals,
    disclaimer: DISCLAIMER,
  };
}

const STATUS_LABELS: Record<OwaspCategorySummary["status"], string> = {
  "not-evaluated": "Not Evaluated",
  "no-findings": "No Findings",
  "findings-present": "Findings Present",
};

function formatFindingLine(f: AggregatedFinding): string {
  const location = f.line !== undefined ? `${f.file}:${f.line}` : f.file;
  return `  \`${location}\`  [${f.rule}]  ${f.message}`;
}

/**
 * Renders an OwaspReport as Markdown. Status text is deliberately plain
 * words, not a checkmark/cross icon — @azmr/ai's formatReport uses ✓/✗ for
 * "clean file" vs "has issues," which is fine for a dev tool but risks a
 * pass/fail misread in a compliance artifact if reused here for "No
 * Findings" (which is not a pass).
 */
export function formatOwaspReportMarkdown(report: OwaspReport): string {
  const lines: string[] = [];
  lines.push("# OWASP Top 10 Compliance Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt} · Tool: ${report.toolVersion}`);
  lines.push("");
  lines.push("## Disclaimer");
  lines.push("");
  for (const paragraph of report.disclaimer) {
    lines.push(paragraph);
    lines.push("");
  }

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total findings: ${report.summary.totalFindings}`);
  if (report.input.totalFilesScanned !== undefined) {
    lines.push(`- Files scanned: ${report.input.totalFilesScanned}`);
  }
  lines.push(
    `- Severity: ${report.summary.bySeverity.error} error, ${report.summary.bySeverity.warning} warning, ${report.summary.bySeverity.info} info`,
  );
  lines.push(
    `- Categories: ${report.summary.categoriesWithFindings} with findings, ${report.summary.categoriesNoFindings} no findings, ${report.summary.categoriesNotEvaluated} not evaluated`,
  );
  lines.push("");

  lines.push("| Category | Status | Findings | Errors | Warnings | Info |");
  lines.push("|---|---|---|---|---|---|");
  for (const cat of report.categories) {
    lines.push(
      `| ${cat.label} | ${STATUS_LABELS[cat.status]} | ${cat.findingCount} | ${cat.bySeverity.error} | ${cat.bySeverity.warning} | ${cat.bySeverity.info} |`,
    );
  }
  lines.push("");

  for (const cat of report.categories) {
    if (cat.findingCount === 0) continue;
    lines.push(`### ${cat.label}`);
    lines.push("");
    for (const f of cat.findings) lines.push(formatFindingLine(f));
    lines.push("");
  }

  if (report.uncategorized.findingCount > 0) {
    lines.push("## Uncategorized Findings");
    lines.push("");
    lines.push(
      "These findings were raised by rules with no OWASP Top 10 mapping — they may " +
        "still represent real code-quality or reliability issues; see the underlying " +
        "analyzer output directly.",
    );
    lines.push("");
    for (const f of report.uncategorized.findings) lines.push(formatFindingLine(f));
    lines.push("");
  }

  if (report.configSignals?.length) {
    lines.push("## Policycore Configuration Signals");
    lines.push("");
    for (const signal of report.configSignals) {
      lines.push(
        `- [${signal.passed ? "x" : " "}] **${signal.id}** (${signal.category}): ${signal.description}`,
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "A clean report is not a certification. See the Disclaimer section above before sharing this report externally.",
  );

  return lines.join("\n");
}

export function formatOwaspReportJson(report: OwaspReport): string {
  return JSON.stringify(report, null, 2);
}

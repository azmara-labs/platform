import fs from "node:fs";
import path from "node:path";
import type { AnalysisFinding } from "@azmr/ai";
import { analyzeSource } from "@azmr/ai";
import type { AnalyzerResultLike, PolicyCoreFinding } from "@azmr/policycore";
import {
  flattenAnalyzerResults,
  formatOwaspReportJson,
  formatOwaspReportMarkdown,
  generateOwaspReport,
  scanSourceForPolicyIssues,
} from "@azmr/policycore";
import { sanitiseForLog } from "@azmr/security";
import { renderTable } from "../utils/table.js";

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "build",
  ".azmara",
]);
const SEVERITY_RANK: Record<"error" | "warning" | "info", number> = {
  error: 3,
  warning: 2,
  info: 1,
};

export interface ScanFinding {
  engine: "ai" | "policycore";
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  hint?: string;
}

export interface ScanFileResult {
  filePath: string; // relative to scanned root
  findings: ScanFinding[];
}

export interface ScanResult {
  root: string;
  filesScanned: number;
  unreadableFiles: string[];
  fileResults: ScanFileResult[]; // only files with >=1 finding
  summary: { total: number; bySeverity: Record<"error" | "warning" | "info", number> };
}

function walk(dir: string, extensions: string[], out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, extensions, out);
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function toScanFindings(
  engine: "ai" | "policycore",
  findings: (AnalysisFinding | PolicyCoreFinding)[],
): ScanFinding[] {
  return findings.map((f) => ({ engine, ...f }));
}

/**
 * Pure scan — no console output, no process.exit. Safe to unit-test directly.
 * Walks a directory (or scans a single file), running @azmr/ai's static
 * analysis plus @azmr/policycore's own security checks against every
 * matched source file.
 */
export function scanDirectory(target: string, options?: { extensions?: string[] }): ScanResult {
  const extensions = options?.extensions ?? DEFAULT_EXTENSIONS;
  const stat = fs.statSync(target);
  const files = stat.isFile() ? [target] : walk(target, extensions);
  const root = stat.isFile() ? path.dirname(target) : target;

  const fileResults: ScanFileResult[] = [];
  const unreadableFiles: string[] = [];
  const bySeverity = { error: 0, warning: 0, info: 0 };

  for (const file of files) {
    let source: string;
    try {
      source = fs.readFileSync(file, "utf-8");
    } catch {
      unreadableFiles.push(path.relative(root, file));
      continue;
    }

    const aiResult = analyzeSource(file, source);
    const policycoreFindings = scanSourceForPolicyIssues(file, source);
    const findings = [
      ...toScanFindings("ai", aiResult.findings),
      ...toScanFindings("policycore", policycoreFindings),
    ];

    if (findings.length > 0) {
      for (const f of findings) bySeverity[f.severity]++;
      fileResults.push({ filePath: path.relative(root, file), findings });
    }
  }

  const total = bySeverity.error + bySeverity.warning + bySeverity.info;
  return {
    root,
    filesScanned: files.length,
    unreadableFiles,
    fileResults,
    summary: { total, bySeverity },
  };
}

function renderTableFormat(result: ScanResult): string {
  const lines: string[] = [];
  lines.push("\n  Azmara Policycore Scan");
  lines.push(`  Root: ${result.root}`);
  lines.push(`  Files scanned: ${result.filesScanned}\n`);

  lines.push(
    renderTable([
      { severity: "error", count: result.summary.bySeverity.error },
      { severity: "warning", count: result.summary.bySeverity.warning },
      { severity: "info", count: result.summary.bySeverity.info },
    ]),
  );

  if (result.fileResults.length === 0) {
    lines.push("\n  ✓ No issues found\n");
    return lines.join("\n");
  }

  const rows = result.fileResults.flatMap((fr) =>
    fr.findings.map((f) => ({
      file: fr.filePath,
      line: f.line ?? "",
      severity: f.severity,
      rule: f.rule,
      message: f.message,
    })),
  );
  lines.push("");
  lines.push(renderTable(rows));

  if (result.unreadableFiles.length > 0) {
    lines.push(`\n  ${result.unreadableFiles.length} file(s) could not be read and were skipped`);
  }
  lines.push("");
  return lines.join("\n");
}

function parseArgs(args: string[]) {
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Map<string, string>();
  for (const a of args) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (k) flags.set(k, v ?? "true");
    }
  }
  return { positional, flags };
}

const FORMATS = ["table", "json", "owasp-md", "owasp-json"] as const;
type Format = (typeof FORMATS)[number];

/** Converts scanDirectory's per-file findings into the shape @azmr/policycore's OWASP report generator expects. */
function toAnalyzerResultLike(result: ScanResult): AnalyzerResultLike[] {
  return result.fileResults.map((fr) => ({ filePath: fr.filePath, findings: fr.findings }));
}

/**
 * azmara policycore:scan [path] [--format=table|json|owasp-md|owasp-json] [--fail-on=error|warning|info|none]
 *
 * Walks a project directory, runs @azmr/ai's static analysis plus
 * @azmr/policycore's own security checks (currently: CORS wildcard +
 * credentials misconfiguration) against every source file, and reports
 * findings. Defaults to the current working directory.
 *
 * --format=owasp-md/owasp-json map findings onto the OWASP Top 10 (2021)
 * categories via @azmr/policycore's generateOwaspReport — see that
 * module's own honesty-first "not-evaluated"/"no-findings"/
 * "findings-present" design before treating a clean report as a pass.
 *
 * No assertSafePath call on the target arg — unlike a server accepting
 * untrusted paths at runtime, this is a local operator invoking a CLI
 * against their own filesystem, matching audit-verify.ts/db-query.ts's
 * existing precedent of resolving operator-supplied CLI paths directly.
 *
 * Usage:
 *   azmara policycore:scan
 *   azmara policycore:scan ./apps/api
 *   azmara policycore:scan --format=json
 *   azmara policycore:scan --format=owasp-md
 *   azmara policycore:scan --fail-on=warning
 */
export function policycoreScan(args: string[]): void {
  const { positional, flags } = parseArgs(args);
  const targetArg = positional[0] ?? ".";
  const format = (flags.get("format") ?? "table") as string;
  const failOn = flags.get("fail-on") ?? "error";

  if (!FORMATS.includes(format as Format)) {
    console.error(
      `\n  Error: unknown --format "${sanitiseForLog(format)}" (expected ${FORMATS.join("|")})\n`,
    );
    process.exit(1);
  }
  if (!["error", "warning", "info", "none"].includes(failOn)) {
    console.error(
      `\n  Error: unknown --fail-on "${sanitiseForLog(failOn)}" (expected error|warning|info|none)\n`,
    );
    process.exit(1);
  }

  const target = path.resolve(targetArg);
  if (!fs.existsSync(target)) {
    console.error(`\n  Error: path not found: ${sanitiseForLog(targetArg)}\n`);
    process.exit(1);
  }

  let result: ScanResult;
  try {
    result = scanDirectory(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  Error: ${sanitiseForLog(msg)}\n`);
    process.exit(1);
    return;
  }

  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else if (format === "owasp-md" || format === "owasp-json") {
    const findings = flattenAnalyzerResults(toAnalyzerResultLike(result));
    const report = generateOwaspReport(findings, {
      totalFilesScanned: result.filesScanned,
      toolVersion: "@azmr/cli policycore:scan",
    });
    console.log(
      format === "owasp-md" ? formatOwaspReportMarkdown(report) : formatOwaspReportJson(report),
    );
  } else {
    console.log(renderTableFormat(result));
  }

  if (failOn === "none") return;
  const thresholdRank = SEVERITY_RANK[failOn as "error" | "warning" | "info"];
  const failed = (["error", "warning", "info"] as const).some(
    (sev) => SEVERITY_RANK[sev] >= thresholdRank && result.summary.bySeverity[sev] > 0,
  );
  if (failed) process.exit(1);
}

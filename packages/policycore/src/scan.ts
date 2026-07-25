/**
 * Policycore-specific static checks — lives here (not the CLI) so it's
 * reusable by any consumer, including a future OWASP report generator,
 * without depending on the CLI package.
 *
 * Regex/line-based, not AST-based — matches this codebase's existing
 * precedent (@azmr/ai's analyze.ts also uses regex-based rules). Adding an
 * AST dependency for one rule isn't justified yet.
 */

export type PolicyCoreSeverity = "error" | "warning" | "info";

export interface PolicyCoreFinding {
  rule: string;
  severity: PolicyCoreSeverity;
  message: string;
  line?: number;
  hint?: string;
}

// Matches a single-level object literal `{ ... }` containing both keys, in
// either order, without crossing into a nested object literal (the
// negative lookahead classes exclude braces so the match can't span past
// the first closing brace it hits).
const CORS_WILDCARD_CREDENTIALS_RE =
  /\{(?=[^{}]*\ballowedOrigins\s*:\s*["']\*["'])(?=[^{}]*\ballowCredentials\s*:\s*true\b)[^{}]*\}/g;

/**
 * Flags a CORS policy object literal that combines `allowedOrigins: "*"`
 * with `allowCredentials: true` — the exact misconfiguration
 * validateCorsPolicy() rejects at runtime. This scan catches it in source
 * before deploy.
 *
 * Known limitation: only catches the two fields as literal `"*"`/`true`
 * within one un-nested object literal — won't catch values built from
 * variables/spread, or config expressed in JSON/YAML. Acceptable v1
 * tradeoff given no real CORS usage exists anywhere in this monorepo yet
 * to validate a more elaborate detector against.
 */
export function scanSourceForPolicyIssues(_filePath: string, source: string): PolicyCoreFinding[] {
  const findings: PolicyCoreFinding[] = [];
  CORS_WILDCARD_CREDENTIALS_RE.lastIndex = 0;
  let match: RegExpExecArray | null = CORS_WILDCARD_CREDENTIALS_RE.exec(source);
  while (match !== null) {
    const line = source.slice(0, match.index).split("\n").length;
    findings.push({
      rule: "cors-wildcard-with-credentials",
      severity: "error",
      message:
        'CORS policy combines allowedOrigins: "*" with allowCredentials: true — reflects every ' +
        "origin with credentials enabled. validateCorsPolicy() rejects this exact combination at " +
        "runtime; this scan catches it in source before deploy.",
      line,
      hint: "Use an explicit origin allowlist (string[] or a predicate function) whenever allowCredentials is true.",
    });
    match = CORS_WILDCARD_CREDENTIALS_RE.exec(source);
  }
  return findings;
}

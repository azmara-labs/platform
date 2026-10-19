// Separates the axe violations a page really has from the ones we have decided to live with.
//
// A known issue is { rule, htmlIncludes, reason }: it excuses a node of that rule whose HTML contains
// that text. Two things fail the check, so the list can only shrink:
//   - a violation that no known issue covers (a new problem);
//   - a known issue that matched nothing (it is fixed, or the markup changed: remove it).

/**
 * @typedef {{ target: string, html: string }} Node
 * @typedef {{ page: string, theme: string, rule: string, impact?: string, help: string, nodes: Node[] }} Violation
 * @typedef {{ rule: string, htmlIncludes: string, reason: string }} KnownIssue
 */

/**
 * @param {Violation[]} violations
 * @param {KnownIssue[]} known
 * @returns {{ unexpected: Violation[], excused: number, unused: KnownIssue[] }}
 */
export function splitKnown(violations, known) {
  const used = new Set();
  let excused = 0;
  const unexpected = [];
  for (const violation of violations) {
    const remaining = violation.nodes.filter((node) => {
      const match = known.find(
        (issue) => issue.rule === violation.rule && node.html.includes(issue.htmlIncludes),
      );
      if (!match) return true;
      used.add(match);
      excused++;
      return false;
    });
    if (remaining.length > 0) unexpected.push({ ...violation, nodes: remaining });
  }
  return { unexpected, excused, unused: known.filter((issue) => !used.has(issue)) };
}

/** Checks the known-issues file has what it must: a rule, the HTML to match, and why we accept it. */
export function validateKnown(known) {
  if (!Array.isArray(known)) throw new Error("the known-issues file must be an array");
  for (const [index, issue] of known.entries()) {
    for (const key of ["rule", "htmlIncludes", "reason"]) {
      if (typeof issue?.[key] !== "string" || issue[key].trim() === "") {
        throw new Error(`known issue ${index} has no ${key}`);
      }
    }
    if (issue.reason.trim().length < 20) {
      throw new Error(
        `known issue ${index} (${issue.rule}) needs a real reason, not "${issue.reason}"`,
      );
    }
  }
  return known;
}

/** A readable summary: one block per rule, with a few pages and nodes as examples. */
export function describe(violations) {
  const byRule = Map.groupBy(violations, (v) => v.rule);
  const lines = [];
  for (const [rule, items] of byRule) {
    const pages = new Set(items.map((i) => i.page));
    lines.push(
      `${rule} (${items[0].impact ?? "unknown"}): ${items[0].help} - ${items.length} on ${pages.size} page(s)`,
    );
    for (const item of items.slice(0, 3)) {
      lines.push(`  ${item.theme} ${item.page}`);
      for (const node of item.nodes.slice(0, 2))
        lines.push(`    ${node.target}\n      ${node.html.slice(0, 140)}`);
    }
  }
  return lines.join("\n");
}

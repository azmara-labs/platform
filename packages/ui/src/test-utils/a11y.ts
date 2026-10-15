import axe, { type Result, type RunOptions } from "axe-core";

// jsdom has no layout engine, so colour contrast cannot be computed here: contrast is
// covered by the token tests instead. `region` wants every node inside a landmark, which
// does not apply to an isolated component fragment.
const defaultOptions: RunOptions = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
};

/** Run axe-core on `target` and return the violations. */
export async function findA11yViolations(
  target: Element,
  options: RunOptions = {},
): Promise<Result[]> {
  const results = await axe.run(target, {
    ...defaultOptions,
    ...options,
    rules: { ...defaultOptions.rules, ...options.rules },
  });
  return results.violations;
}

function format(violations: Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n) => `    ${n.target.join(" ")}  ${n.html.slice(0, 100)}`)
        .join("\n");
      return `- ${v.id} (${v.impact ?? "unknown"}): ${v.help}\n${nodes}`;
    })
    .join("\n");
}

/** Fail the test, listing every rule and node, if axe finds any violation. */
export async function expectNoA11yViolations(
  target: Element,
  options: RunOptions = {},
): Promise<void> {
  const violations = await findA11yViolations(target, options);
  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} accessibility violation(s):\n${format(violations)}`,
    );
  }
}

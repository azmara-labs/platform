import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The Accessibility page makes statements about the package and its tests. These checks keep each
// one true: if a test setup or a component page changes, the page must change with it.

const siteDir = join(import.meta.dirname, "..");
const root = join(siteDir, "..", "..");
const uiSrc = join(root, "packages", "ui", "src");
const read = (...path: string[]) => readFileSync(join(...path), "utf8");
const page = read(siteDir, "content", "docs", "guide", "accessibility.mdx");
const component = (name: string) => read(siteDir, "content", "docs", "components", `${name}.mdx`);

function walk(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match.test(entry)) out.push(full);
  }
  return out;
}

describe("what the Accessibility page says is tested", () => {
  const uiTests = walk(uiSrc, /\.test\.tsx?$/);

  it("finds the package's tests (guards against scanning nothing)", () => {
    expect(uiTests.length).toBeGreaterThan(60);
  });

  it("is right that more than thirty test files fail on an axe violation", () => {
    const withAxe = uiTests.filter((f) =>
      readFileSync(f, "utf8").includes("expectNoA11yViolations"),
    );
    expect(withAxe.length).toBeGreaterThan(30);
    expect(read(uiSrc, "test-utils", "a11y.ts")).toMatch(
      /throw new Error\(\s*`Found \$\{violations\.length\} accessibility violation/,
    );
    expect(page).toContain("More than thirty");
  });

  it("is right that the docs tests axe-check every demo and fail the build", () => {
    const demos = read(siteDir, "src", "demos", "demos.test.tsx");
    expect(demos).toContain("axe.run");
    expect(demos).toContain("every demo renders and is accessible");
  });

  it("is right that keyboard use is driven with simulated key presses", () => {
    expect(read(uiSrc, "test-utils", "user.ts")).toContain("user-event");
    const keys = uiTests.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const key of ["user.tab()", "{ArrowDown}", "{Home}", "{End}", "{Enter}", "{Escape}"]) {
      expect(keys, key).toContain(key);
    }
  });

  it("is right that contrast is computed and reduced motion is tested", () => {
    expect(read(uiSrc, "styles", "tokens.test.ts")).toContain("wcagContrast");
    expect(read(uiSrc, "styles", "tokens.test.ts")).toContain("prefers-reduced-motion");
    expect(readdirSync(join(uiSrc, "styles"))).toContain("motion.test.ts");
  });

  it("states the target the design spec sets, and that the issue tracker exists", () => {
    const spec = read(root, "docs", "superpowers", "specs", "2026-10-15-azmr-ui-design.md");
    expect(spec).toContain("WCAG 2.2 AA");
    expect(page).toContain("WCAG 2.2 level AA");
    expect(page).toContain("github.com/azmara-labs/platform/issues");
  });
});

describe("the guidance on the Accessibility page matches the component pages", () => {
  it("icon-only controls: IconButton needs a label, size=icon needs a name, a tooltip is not a name", () => {
    const button = component("button");
    expect(button).toMatch(/`label` is \*\*required\*\*/);
    expect(button).toContain("TypeScript requires `aria-label` or `aria-labelledby`");
    expect(button).toContain("a tooltip is not an accessible name on touch devices");
  });

  it("errors: Input exposes aria-invalid and says to pair it with text", () => {
    const input = component("input");
    expect(input).toContain("`aria-invalid`");
    expect(input).toContain("pair it with a text message");
  });

  it("dialogs: focus is trapped, the page is inert, focus returns, alert dialog starts on cancel, a title is required", () => {
    const modal = component("modal");
    expect(modal).toContain("**Traps focus.**");
    expect(modal).toContain("**Makes the page inert.**");
    expect(modal).toContain("**Returns focus.**");
    expect(modal).toContain("Focus starts on `AlertDialogCancel`");
    expect(modal).toContain("Always include a title");
  });

  it("announcements: toasts are a polite live region with errors also alerted; loading sets aria-busy", () => {
    const toast = component("toast");
    expect(toast).toContain("polite live region");
    expect(toast).toContain("Errors are also written to a separate alert");
    expect(toast).toContain('named "Notifications"');
    expect(component("button")).toContain("`aria-busy`");
  });

  it("motion: data-motion=essential exists and the Theming guide has the reduced-motion section the page links to", () => {
    const tokens = read(uiSrc, "styles", "tokens.css");
    expect(tokens).toContain('data-motion="essential"');
    expect(read(siteDir, "content", "docs", "guide", "theming.mdx")).toMatch(
      /^## Reduced motion$/m,
    );
  });
});

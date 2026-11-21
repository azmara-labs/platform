import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitKnown, describe as summarise, validateKnown } from "./axe-report.mjs";

const siteDir = join(import.meta.dirname, "..");

const node = (html: string, target = "x") => ({ target, html });
const violation = (rule: string, nodes: { target: string; html: string }[], page = "/docs") => ({
  page,
  theme: "light",
  rule,
  impact: "moderate",
  help: "help text",
  nodes,
});
const issue = (rule: string, htmlIncludes: string) => ({
  rule,
  htmlIncludes,
  reason: "a long enough reason to be a real one",
});

describe("splitKnown", () => {
  it("excuses a node of a known rule whose HTML matches, and reports nothing else", () => {
    const result = splitKnown(
      [violation("landmark-unique", [node('<div class="fd-scroll-container">')])],
      [issue("landmark-unique", "fd-scroll-container")],
    );
    expect(result.unexpected).toEqual([]);
    expect(result.excused).toBe(1);
    expect(result.unused).toEqual([]);
  });

  it("reports a violation of a rule that is not known", () => {
    const result = splitKnown(
      [violation("color-contrast", [node("<p>")])],
      [issue("landmark-unique", "fd-scroll-container")],
    );
    expect(result.unexpected.map((v) => v.rule)).toEqual(["color-contrast"]);
  });

  it("reports a known rule on markup the issue does not describe", () => {
    const result = splitKnown(
      [violation("landmark-unique", [node('<nav class="something-else">')])],
      [issue("landmark-unique", "fd-scroll-container")],
    );
    expect(result.unexpected).toHaveLength(1);
  });

  it("keeps only the nodes that are not excused when a violation has both", () => {
    const result = splitKnown(
      [
        violation("landmark-unique", [
          node('<div class="fd-scroll-container">'),
          node('<section class="new-region">'),
        ]),
      ],
      [issue("landmark-unique", "fd-scroll-container")],
    );
    expect(result.unexpected).toHaveLength(1);
    expect(result.unexpected[0]?.nodes.map((n) => n.html)).toEqual([
      '<section class="new-region">',
    ]);
    expect(result.excused).toBe(1);
  });

  it("reports a known issue that matched nothing, so a fixed one is removed from the list", () => {
    const stale = issue("landmark-unique", "fd-scroll-container");
    const result = splitKnown([], [stale]);
    expect(result.unused).toEqual([stale]);
  });
});

describe("validateKnown", () => {
  it("accepts an issue with a rule, the HTML to match and a reason", () => {
    expect(validateKnown([issue("a", "b")])).toHaveLength(1);
  });

  it.each([
    [{ htmlIncludes: "b", reason: "a long enough reason to be a real one" }, /no rule/],
    [{ rule: "a", reason: "a long enough reason to be a real one" }, /no htmlIncludes/],
    [{ rule: "a", htmlIncludes: "b" }, /no reason/],
    [{ rule: "a", htmlIncludes: "b", reason: "todo" }, /needs a real reason/],
  ])("rejects %j", (bad, message) => {
    expect(() => validateKnown([bad])).toThrow(message);
  });

  it("rejects anything that is not a list", () => {
    expect(() => validateKnown({})).toThrow(/array/);
  });
});

describe("summarise", () => {
  it("names each rule once, with the pages and nodes it affects", () => {
    const text = summarise([
      violation("heading-order", [node("<h3>One</h3>", "h3")], "/a"),
      violation("heading-order", [node("<h3>Two</h3>", "h3")], "/b"),
    ]);
    expect(text).toContain("heading-order (moderate): help text - 2 on 2 page(s)");
    expect(text).toContain("/a");
    expect(text).toContain("<h3>One</h3>");
  });
});

describe("the real known-issues file", () => {
  it("is valid, and every entry says why it is accepted", () => {
    const known = JSON.parse(readFileSync(join(siteDir, "a11y-known-issues.json"), "utf8"));
    expect(validateKnown(known).length).toBeGreaterThan(0);
  });
});

describe("the page check is wired into the build and CI", () => {
  const pkg = JSON.parse(readFileSync(join(siteDir, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const ci = readFileSync(join(siteDir, "..", "..", ".github", "workflows", "ci.yml"), "utf8");

  it("has a script, and CI runs it against the built site", () => {
    expect(pkg.scripts["check:pages"]).toContain("axe-pages.mjs");
    expect(ci).toContain("check:pages");
    expect(ci).toMatch(/next start|pnpm --filter @azmr\/site start/);
  });
});

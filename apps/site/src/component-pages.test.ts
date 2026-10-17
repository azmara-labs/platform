import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { componentFrontmatter } from "./lib/docs-frontmatter";

// The component page standard (PAZM-126). Every page under content/docs/components must have the
// frontmatter the component index needs, open with its Usage section, document accessibility, show
// a generated props table, and show a keyboard map when the component takes keyboard input.
//
// Known gaps are listed below with a reason. A name in a list that no longer needs excusing fails
// the test, so a fixed page cannot stay on a list.

const componentsDir = join(import.meta.dirname, "..", "content", "docs", "components");
const slugs = readdirSync(componentsDir)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => file.replace(/\.mdx$/, ""))
  .sort();

/** Pages whose first section is not "Usage", and what it is instead. */
const firstSection: Record<string, string> = {
  motion: "Principles",
};

/** Pages with no generated props table yet (an AutoTypeTable on the real type). */
const noGeneratedTable: Record<string, string> = {};

/** Pages with no Accessibility section yet. */
const noAccessibility: Record<string, string> = {};

function read(slug: string) {
  const text = readFileSync(join(componentsDir, `${slug}.mdx`), "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const body = text.slice(match?.[0].length ?? 0);
  const data = match ? (parse(match[1] as string) as unknown) : undefined;
  const headings = [...body.replace(/^```[\s\S]*?^```/gm, "").matchAll(/^## (.+)$/gm)].map((m) =>
    (m[1] as string).trim(),
  );
  return { data, body, headings };
}

describe("component pages", () => {
  it("finds the pages (guards against scanning nothing)", () => {
    expect(slugs.length).toBeGreaterThan(15);
  });

  describe.each(slugs)("%s", (slug) => {
    const page = read(slug);

    it("has valid component frontmatter (group, status, since, interactive)", () => {
      const result = componentFrontmatter.safeParse(page.data);
      expect(
        result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      ).toEqual([]);
    });

    it("opens with its Usage section", () => {
      const expected = firstSection[slug] ?? "Usage";
      expect(page.headings[0]).toBe(expected);
    });

    it("has an Accessibility section", () => {
      if (slug in noAccessibility) return;
      expect(page.headings).toContain("Accessibility");
    });

    it("shows a generated props table", () => {
      if (slug in noGeneratedTable) return;
      expect(page.body).toContain("<AutoTypeTable");
    });

    it("shows a keyboard map if and only if it is marked interactive", () => {
      const interactive = (page.data as { interactive?: boolean } | undefined)?.interactive;
      expect(page.body.includes("<KeyboardMap")).toBe(interactive === true);
    });
  });

  describe("the exception lists", () => {
    it("only name real pages", () => {
      for (const name of [
        ...Object.keys(firstSection),
        ...Object.keys(noGeneratedTable),
        ...Object.keys(noAccessibility),
      ]) {
        expect(slugs, `"${name}" is not a component page`).toContain(name);
      }
    });

    it("do not excuse a page that already meets the rule", () => {
      for (const name of Object.keys(noGeneratedTable)) {
        expect(
          read(name).body,
          `${name} now has a table: remove it from noGeneratedTable`,
        ).not.toContain("<AutoTypeTable");
      }
      for (const name of Object.keys(noAccessibility)) {
        expect(
          read(name).headings,
          `${name} now has Accessibility: remove it from noAccessibility`,
        ).not.toContain("Accessibility");
      }
      for (const [name, section] of Object.entries(firstSection)) {
        expect(read(name).headings[0], `${name} should open with "${section}"`).toBe(section);
      }
    });
  });
});

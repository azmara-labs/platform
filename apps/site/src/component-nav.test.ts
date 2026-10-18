import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { COMPONENT_GROUPS, componentFrontmatter } from "./lib/docs-frontmatter";

// The component index and the sidebar are what a visitor uses to find a component. The index is
// generated from the pages' frontmatter, so it cannot miss one; the sidebar is a hand-ordered
// meta.json, so this test makes it agree with the frontmatter: every component page is listed,
// each under the heading of its own group, and the headings follow the schema's order.

const componentsDir = join(import.meta.dirname, "..", "content", "docs", "components");

const slugs = readdirSync(componentsDir)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => file.replace(/\.mdx$/, ""))
  .sort();

function groupOf(slug: string): string | undefined {
  const text = readFileSync(join(componentsDir, `${slug}.mdx`), "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  const parsed = componentFrontmatter.safeParse(parse(frontmatter ?? ""));
  return parsed.success ? parsed.data.group : undefined;
}

const meta = JSON.parse(readFileSync(join(componentsDir, "meta.json"), "utf8")) as {
  pages: string[];
};

/** The sidebar as sections: each "---Heading---" separator and the pages that follow it. */
function sections(pages: string[]): { heading: string | undefined; pages: string[] }[] {
  const out: { heading: string | undefined; pages: string[] }[] = [
    { heading: undefined, pages: [] },
  ];
  for (const entry of pages) {
    const heading = /^---(.+)---$/.exec(entry)?.[1];
    if (heading) out.push({ heading, pages: [] });
    else out.at(-1)?.pages.push(entry);
  }
  return out;
}

describe("the components sidebar", () => {
  const parsed = sections(meta.pages);

  it("finds the component pages (guards against scanning nothing)", () => {
    expect(slugs.length).toBeGreaterThan(15);
  });

  it("opens with the index and lists every component page exactly once", () => {
    expect(meta.pages[0]).toBe("index");
    const listed = meta.pages.filter((p) => p !== "index" && !p.startsWith("---"));
    expect([...listed].sort()).toEqual(slugs);
  });

  it("puts each page under the heading of its own group", () => {
    const wrong: string[] = [];
    for (const section of parsed) {
      for (const slug of section.pages) {
        if (slug === "index") continue;
        const group = groupOf(slug);
        if (group !== section.heading) {
          wrong.push(`${slug} is under "${section.heading}" but its group is "${group}"`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("lists the group headings in the schema's order, each once, none empty", () => {
    const headings = parsed.flatMap((s) => (s.heading ? [s.heading] : []));
    expect(headings).toEqual(COMPONENT_GROUPS.filter((g) => headings.includes(g)));
    expect(new Set(headings).size).toBe(headings.length);
    expect(parsed.filter((s) => s.heading && s.pages.length === 0).map((s) => s.heading)).toEqual(
      [],
    );
  });

  it("has a heading for every group that has a page", () => {
    const used = new Set(slugs.map(groupOf));
    const headings = new Set(parsed.map((s) => s.heading));
    for (const group of used) expect(headings.has(group), `${group}`).toBe(true);
  });
});

describe("the components index page", () => {
  it("embeds the generated index instead of a hand-written list", () => {
    const text = readFileSync(join(componentsDir, "index.mdx"), "utf8");
    expect(text).toContain("<ComponentIndex />");
    expect(text).not.toMatch(/^- \[\w+\]\(\/docs\/components\//m);
  });
});

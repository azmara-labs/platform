import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { docsFrontmatter } from "../src/lib/docs-frontmatter";
import {
  extractKeyMaps,
  parseLiteral,
  readComponent,
  readComponents,
  renderReference,
} from "./build-accessibility";

const componentsDir = join(import.meta.dirname, "..", "content", "docs", "components");

const page = (frontmatter: string, body: string) => `---\n${frontmatter}\n---\n${body}`;

describe("extractKeyMaps", () => {
  it("reads the rows of a key map and the heading it sits under", () => {
    const body = `## Keyboard

<KeyboardMap
  rows={[
    { keys: ["Tab"], action: "Moves focus." },
    { keys: ["Enter", "Space"], action: "Activates, with a | pipe." },
  ]}
/>`;
    expect(extractKeyMaps(body)).toEqual([
      {
        label: "Keyboard",
        rows: [
          { keys: ["Tab"], action: "Moves focus." },
          { keys: ["Enter", "Space"], action: "Activates, with a | pipe." },
        ],
      },
    ]);
  });

  it("finds several maps on one page, each with its own heading", () => {
    const body = `### Accordion keys

<KeyboardMap rows={[{ keys: ["Tab"], action: "a" }]} />

### Tabs keys

<KeyboardMap rows={[{ keys: ["ArrowRight"], action: "b" }]} />`;
    expect(extractKeyMaps(body).map((m) => m.label)).toEqual(["Accordion keys", "Tabs keys"]);
  });

  it("returns nothing for a page with no key map", () => {
    expect(extractKeyMaps("## Usage\n\nNothing here.")).toEqual([]);
  });

  it("rejects rows that are not { keys: string[], action }", () => {
    expect(() => extractKeyMaps('<KeyboardMap rows={[{ keys: "Tab", action: "x" }]} />')).toThrow(
      /does not have/,
    );
    expect(() => extractKeyMaps('<KeyboardMap rows={[{ keys: ["Tab"] }]} />')).toThrow(
      /does not have/,
    );
  });
});

describe("parseLiteral never runs code", () => {
  it("reads arrays, objects, strings, numbers, booleans, null and template strings without expressions", () => {
    expect(
      parseLiteral('[{ keys: ["Tab"], "action": `Moves`, n: 2, ok: true, none: null }]'),
    ).toEqual([{ keys: ["Tab"], action: "Moves", n: 2, ok: true, none: null }]);
  });

  it.each([
    ["a call", "[process.exit(1)]"],
    ["a variable", "[secret]"],
    ["a spread", "[...other]"],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source code quoted as text
    ["a template expression", "[`${1 + 1}`]"],
    ["a computed key", '[{ ["a" + "b"]: 1 }]'],
    ["a method", "[{ f() {} }]"],
    ["a function", "[() => 1]"],
    ["a regular expression", "[/x/]"],
    ["a hole", "[1, , 2]"],
    ["__proto__", '[{ "__proto__": {} }]'],
  ])("rejects %s", (_name, source) => {
    expect(() => parseLiteral(source)).toThrow();
  });

  it("does not execute a call hidden in a page's rows", () => {
    const g = globalThis as { __ran?: boolean };
    g.__ran = false;
    expect(() =>
      extractKeyMaps(
        '<KeyboardMap rows={[(globalThis.__ran = true, { keys: ["Tab"], action: "x" })]} />',
      ),
    ).toThrow();
    expect(g.__ran).toBe(false);
  });
});

describe("readComponent", () => {
  const map = '<KeyboardMap rows={[{ keys: ["Tab"], action: "x" }]} />';

  it("counts demos and finds the Accessibility section", () => {
    const c = readComponent(
      "x",
      page(
        "title: X\ngroup: Inputs\ninteractive: true",
        `<Demo name="a/b" />\n<Demo name="a/c" />\n## Accessibility\n\n${map}`,
      ),
    );
    expect(c).toMatchObject({
      title: "X",
      group: "Inputs",
      interactive: true,
      demos: 2,
      hasAccessibilitySection: true,
    });
  });

  it("fails when an interactive page has no key map, or a key map is on a non-interactive page", () => {
    expect(() =>
      readComponent("x", page("title: X\ninteractive: true", "## Accessibility")),
    ).toThrow(/no KeyboardMap/);
    expect(() => readComponent("x", page("title: X\ninteractive: false", map))).toThrow(
      /not marked interactive/,
    );
  });
});

describe("the reference for the real component pages", () => {
  const components = readComponents(componentsDir);
  const mdx = renderReference(components);
  const slugs = readdirSync(componentsDir)
    .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();

  it("covers every component page (guards against scanning nothing)", () => {
    expect(components.length).toBeGreaterThan(15);
    expect(components.map((c) => c.slug).sort()).toEqual(slugs);
  });

  it("has a table row, linked to the page, for every component", () => {
    for (const c of components) expect(mdx, c.slug).toContain(`](/docs/components/${c.slug})`);
  });

  it("agrees with the frontmatter: interactive exactly where there is a key map", () => {
    for (const c of components) {
      const text = readFileSync(join(componentsDir, `${c.slug}.mdx`), "utf8");
      const interactive = parseYaml(/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "").interactive;
      expect(c.interactive, c.slug).toBe(interactive === true);
      expect(c.keyMaps.length > 0, c.slug).toBe(c.interactive);
    }
  });

  it("includes every key map row of every interactive component", () => {
    const total = components.reduce(
      (sum, c) => sum + c.keyMaps.reduce((s, m) => s + m.rows.length, 0),
      0,
    );
    const shown = [...mdx.matchAll(/"action":/g)].length;
    expect(total).toBeGreaterThan(40);
    expect(shown).toBe(total);
  });

  it("counts the live demos on each page, matching the page", () => {
    for (const c of components) {
      const text = readFileSync(join(componentsDir, `${c.slug}.mdx`), "utf8");
      expect(c.demos, c.slug).toBe([...text.matchAll(/<Demo\s+name="/g)].length);
    }
  });

  it("lists components in the sidebar's order, grouped by the schema", () => {
    const rows = [
      ...mdx.matchAll(/^\| \[[^\]]+\]\(\/docs\/components\/([\w-]+)\) \| ([\w ]+) \|/gm),
    ].map((m) => [m[1], m[2]]);
    expect(rows.length).toBe(components.length);
    const groups = rows.map((r) => r[1]);
    const order = [
      "Layout",
      "Inputs",
      "Data display",
      "Feedback",
      "Overlays",
      "Navigation",
      "Utils",
    ];
    const indices = groups.map((g) => order.indexOf(g as string));
    expect([...indices].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(indices);
  });

  it("has valid frontmatter for the docs site", () => {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(mdx);
    expect(docsFrontmatter.safeParse(parseYaml(match?.[1] ?? "")).success).toBe(true);
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type AnyNode, parseExpressionAt } from "acorn";
import { parse as parseYaml } from "yaml";
import { COMPONENT_GROUPS } from "../src/lib/component-taxonomy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, "../content/docs/components");
const OUTPUT = path.resolve(__dirname, "../content/docs/guide/accessibility-reference.mdx");

export interface KeyRow {
  keys: string[];
  action: string;
}

export interface KeyMap {
  /** The heading the map sits under on its page, e.g. "Keyboard" or "Tabs". */
  label: string;
  rows: KeyRow[];
}

export interface ComponentAccessibility {
  slug: string;
  title: string;
  group: string;
  interactive: boolean;
  keyMaps: KeyMap[];
  /** How many live demos the page embeds. Every demo is rendered and axe-checked by the docs tests. */
  demos: number;
  hasAccessibilitySection: boolean;
}

/**
 * Reads a JavaScript literal made only of arrays, objects with plain keys, strings, numbers,
 * booleans and null. Anything else (a call, a spread, a variable, a template with an expression) is
 * an error, so a page can never run code at build time.
 */
export function parseLiteral(source: string): unknown {
  const read = (node: AnyNode): unknown => {
    switch (node.type) {
      case "Literal": {
        if ("regex" in node || "bigint" in node) {
          throw new Error("a KeyboardMap may only contain plain values");
        }
        return node.value;
      }
      case "TemplateLiteral":
        if (node.expressions.length > 0) {
          throw new Error("a KeyboardMap may not use template expressions");
        }
        return node.quasis[0]?.value.cooked ?? "";
      case "ArrayExpression":
        return node.elements.map((element) => {
          if (!element || element.type === "SpreadElement") {
            throw new Error("a KeyboardMap may only contain plain items");
          }
          return read(element);
        });
      case "ObjectExpression": {
        const out: Record<string, unknown> = {};
        for (const property of node.properties) {
          if (
            property.type !== "Property" ||
            property.computed ||
            property.kind !== "init" ||
            property.method ||
            property.shorthand
          ) {
            throw new Error("a KeyboardMap may only have plain key: value properties");
          }
          const key = property.key;
          const name =
            key.type === "Identifier"
              ? key.name
              : key.type === "Literal"
                ? String(key.value)
                : undefined;
          if (name === undefined || name === "__proto__") {
            throw new Error("a KeyboardMap has an unsupported key");
          }
          out[name] = read(property.value);
        }
        return out;
      }
      default:
        throw new Error(`a KeyboardMap may only contain literals, found ${node.type}`);
    }
  };
  return read(parseExpressionAt(source.trim(), 0, { ecmaVersion: "latest" }));
}

/** Every `<KeyboardMap rows={[...]} />` in a page, with the heading it sits under. */
export function extractKeyMaps(body: string): KeyMap[] {
  const maps: KeyMap[] = [];
  const pattern = /<KeyboardMap\s+rows=\{([\s\S]*?)\}\s*\/>/g;
  for (const match of body.matchAll(pattern)) {
    const before = body.slice(0, match.index);
    const heading = [...before.matchAll(/^#{2,4} (.+)$/gm)].at(-1)?.[1] ?? "Keyboard";
    const rows = parseLiteral(match[1] as string);
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (row) =>
          row &&
          typeof row.action === "string" &&
          Array.isArray(row.keys) &&
          row.keys.every((key: unknown) => typeof key === "string"),
      )
    ) {
      throw new Error(
        `a KeyboardMap under "${heading}" does not have { keys: string[], action } rows`,
      );
    }
    maps.push({ label: heading.trim(), rows: rows as KeyRow[] });
  }
  return maps;
}

export function readComponent(slug: string, text: string): ComponentAccessibility {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`${slug}: no frontmatter`);
  const data = parseYaml(match[1] as string) as {
    title?: string;
    group?: string;
    interactive?: boolean;
  };
  const body = text.slice(match[0].length);
  const keyMaps = extractKeyMaps(body);
  if (data.interactive === true && keyMaps.length === 0) {
    throw new Error(`${slug} is marked interactive but has no KeyboardMap`);
  }
  if (data.interactive !== true && keyMaps.length > 0) {
    throw new Error(`${slug} has a KeyboardMap but is not marked interactive`);
  }
  return {
    slug,
    title: data.title ?? slug,
    group: data.group ?? "",
    interactive: data.interactive === true,
    keyMaps,
    demos: [...body.matchAll(/<Demo\s+name="/g)].length,
    hasAccessibilitySection: /^## Accessibility\s*$/m.test(body),
  };
}

/** The component pages in sidebar order (the order of components/meta.json), index excluded. */
export function readComponents(dir: string): ComponentAccessibility[] {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) as {
    pages: string[];
  };
  const slugs = meta.pages.filter((page) => page !== "index" && !page.startsWith("---"));
  return slugs.map((slug) =>
    readComponent(slug, fs.readFileSync(path.join(dir, `${slug}.mdx`), "utf8")),
  );
}

const cell = (text: string) => text.replaceAll("|", "\\|");

export function renderReference(components: ComponentAccessibility[]): string {
  const groupOrder = (c: ComponentAccessibility) =>
    COMPONENT_GROUPS.indexOf(c.group as (typeof COMPONENT_GROUPS)[number]);
  const ordered = [...components].sort((a, b) => groupOrder(a) - groupOrder(b));
  const interactive = ordered.filter((c) => c.interactive);

  const table = [
    "| Component | Group | Takes keyboard input | Key map rows | Live demos (axe-checked) | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...ordered.map((c) => {
      const rows = c.keyMaps.reduce((sum, map) => sum + map.rows.length, 0);
      return `| [${cell(c.title)}](/docs/components/${c.slug}) | ${c.group} | ${c.interactive ? "Yes" : "No"} | ${rows || "n/a"} | ${c.demos} | ${c.hasAccessibilitySection ? `[Accessibility](/docs/components/${c.slug}#accessibility)` : "none yet"} |`;
    }),
  ].join("\n");

  const maps = interactive
    .map((c) => {
      const heading = `### [${c.title}](/docs/components/${c.slug}#accessibility)`;
      const body = c.keyMaps
        .map((map) => {
          const label = c.keyMaps.length > 1 ? `#### ${map.label}\n\n` : "";
          return `${label}<KeyboardMap rows={${JSON.stringify(map.rows)}} />`;
        })
        .join("\n\n");
      return `${heading}\n\n${body}`;
    })
    .join("\n\n");

  return `---
title: Accessibility reference
description: Which components take keyboard input, every component's key map in one place, and what is checked for each page.
---

{/* Generated by scripts/build-accessibility.ts from the component pages. Do not edit. */}

This page is generated from the component pages when the docs are built, so it lists every component and cannot drift from them. For what is tested and what is not, see [Accessibility](/docs/guide/accessibility).

## By component

${table}

"Live demos" counts the demos embedded on the page. The docs tests render every demo and fail on an axe violation, so each one is accessibility-checked. "Key map rows" counts the rows of the key map on the page.

## Keyboard reference

${interactive.length} components take keyboard input. Each key map below is the one on the component's own page.

${maps}
`;
}

export function generate(): void {
  const components = readComponents(COMPONENTS_DIR);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, renderReference(components));
  console.log(
    `[build-accessibility] generated accessibility-reference.mdx for ${components.length} components`,
  );
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  generate();
}

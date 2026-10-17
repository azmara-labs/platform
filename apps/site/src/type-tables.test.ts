import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createGenerator } from "fumadocs-typescript";
import { describe, expect, it } from "vitest";

// Runs the real props-table generator over every <AutoTypeTable> on the component pages, the same
// way the docs build does. Pointing a table at a props interface that extends a DOM element's
// attributes lists hundreds of inherited properties (the whole HTML, SVG and ARIA set), so a table
// narrows the type with `Pick`. This fails on a table that is empty, floods the page, names a
// property the type does not have, or leaves out a prop the component declares itself.

const siteDir = join(import.meta.dirname, "..");
const componentsDir = join(siteDir, "content", "docs", "components");

/** A props table with more rows than this is almost certainly listing inherited DOM attributes. */
const MAX_PROPS = 40;

interface Table {
  page: string;
  path: string;
  name: string | undefined;
  type: string | undefined;
}

function tables(): Table[] {
  const out: Table[] = [];
  for (const file of readdirSync(componentsDir).filter((f) => f.endsWith(".mdx"))) {
    const text = readFileSync(join(componentsDir, file), "utf8");
    for (const match of text.matchAll(/<AutoTypeTable\s+([\s\S]*?)\/>/g)) {
      const attrs = match[1] as string;
      out.push({
        page: file,
        path: /path="([^"]+)"/.exec(attrs)?.[1] as string,
        name: /name="([^"]+)"/.exec(attrs)?.[1],
        type: /type=\{`([\s\S]*?)`\}/.exec(attrs)?.[1],
      });
    }
  }
  return out;
}

/** The type a `Pick<Type, "a" | "b">` expression narrows, and the property names it asks for. */
function picked(type: string | undefined): { source: string; keys: string[] } | undefined {
  const match = type ? /Pick<\s*(\w+)\s*,\s*([^>]+)>/.exec(type) : undefined;
  if (!match) return undefined;
  return {
    source: match[1] as string,
    keys: [...(match[2] as string).matchAll(/"([^"]+)"/g)].map((m) => m[1] as string),
  };
}

const all = tables();

describe("props tables on the component pages", () => {
  it("finds the tables (guards against scanning nothing)", () => {
    expect(all.length).toBeGreaterThan(20);
    expect(all.every((t) => t.path)).toBe(true);
  });

  it("each lists a sensible number of properties, picks only properties that exist, and omits none the component declares", async () => {
    // The tests run from the repo root in CI, where there is no tsconfig.json, so name the site's.
    const generator = createGenerator({ tsconfigPath: join(siteDir, "tsconfig.json") });
    const problems: string[] = [];
    for (const table of all) {
      const label = `${table.page}: ${table.name ?? "?"}`;
      const docs = await generator.generateTypeTable(
        { path: table.path, name: table.name, type: table.type },
        { basePath: siteDir },
      );
      const names = docs.flatMap((doc) => doc.entries.map((entry) => entry.name));
      if (names.length === 0) problems.push(`${label} lists no properties`);
      if (names.length > MAX_PROPS) {
        problems.push(
          `${label} lists ${names.length} properties (more than ${MAX_PROPS}): narrow it with Pick, or point it at an own-props type`,
        );
      }

      // A misspelled key does not fail the generator: it lists a property of that name anyway. So
      // check the keys against the properties of the full type the table narrows, and check that
      // every property the component declares in our own source is among them.
      const narrowed = picked(table.type);
      if (narrowed && table.type) {
        const own: string[] = [];
        const full = await generator.generateTypeTable(
          {
            path: table.path,
            name: "FullDocProps",
            type: table.type.replace(
              /export type[\s\S]*$/,
              `export type FullDocProps = ${narrowed.source}`,
            ),
          },
          {
            basePath: siteDir,
            transform(entry, _type, symbol) {
              const declaredHere = symbol.getDeclarations().some((declaration) => {
                const file = declaration.getSourceFile().getFilePath().replaceAll("\\", "/");
                return file.includes("/packages/ui/src/") && !file.includes("node_modules");
              });
              if (declaredHere) own.push(entry.name);
            },
          },
        );
        const fullNames = new Set(full.flatMap((doc) => doc.entries.map((entry) => entry.name)));
        for (const key of narrowed.keys) {
          if (!fullNames.has(key)) {
            problems.push(`${label} asks for "${key}", which ${narrowed.source} does not have`);
          }
        }
        for (const name of own) {
          if (!narrowed.keys.includes(name)) {
            problems.push(
              `${label} leaves out "${name}", which ${narrowed.source} declares: add it to the Pick`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  }, 180_000);
});

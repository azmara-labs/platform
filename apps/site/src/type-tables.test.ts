import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createGenerator } from "fumadocs-typescript";
import { describe, expect, it } from "vitest";

// Runs the real props-table generator over every <AutoTypeTable> on the component pages, the same
// way the docs build does. Pointing a table at a props interface that extends a DOM element's
// attributes lists hundreds of inherited properties (the whole HTML, SVG and ARIA set), so a table
// must name an own-props type or narrow the type with `Pick`. This fails on a table that is empty,
// floods the page, or names a property that no longer exists.

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

/**
 * Tables that still list every inherited DOM attribute (about 280 rows each), found when this test
 * was added. Each should be narrowed to the component's own props with `Pick` (or an own-props type),
 * then removed from this list. The test fails if a listed table is fixed and still listed.
 */
const flooded = new Set([
  "avatar.mdx: AvatarGroupProps",
  "breadcrumb.mdx: BreadcrumbsProps",
  "disclosure.mdx: AccordionTriggerProps",
  "display.mdx: AlertProps",
  "layout.mdx: StackProps",
  "layout.mdx: GridProps",
  "menu.mdx: MenuItemProps",
  "menu.mdx: DropdownMenuContentProps",
  "modal.mdx: DialogContentProps",
  "pagination.mdx: PaginationProps",
  "stepper.mdx: StepperProps",
  "table.mdx: TableProps",
  "toggle.mdx: ToggleGroupProps",
]);

const all = tables();

describe("props tables on the component pages", () => {
  it("finds the tables (guards against scanning nothing)", () => {
    expect(all.length).toBeGreaterThan(20);
    expect(all.every((t) => t.path)).toBe(true);
  });

  it("each lists a sensible number of properties, and picks only properties that exist", async () => {
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
      const isFlooded = names.length > MAX_PROPS;
      if (isFlooded && !flooded.has(label)) {
        problems.push(
          `${label} lists ${names.length} properties (more than ${MAX_PROPS}): point it at an own-props type or narrow it with Pick`,
        );
      }
      if (!isFlooded && flooded.has(label)) {
        problems.push(`${label} is fixed now: remove it from the flooded list`);
      }
      // A misspelled key does not fail the generator: it lists a property of that name anyway. So
      // check the keys against the properties of the full type the table narrows.
      const narrowed = picked(table.type);
      if (narrowed && table.type) {
        const full = await generator.generateTypeTable(
          {
            path: table.path,
            name: "FullDocProps",
            type: table.type.replace(
              /export type[\s\S]*$/,
              `export type FullDocProps = ${narrowed.source}`,
            ),
          },
          { basePath: siteDir },
        );
        const fullNames = new Set(full.flatMap((doc) => doc.entries.map((entry) => entry.name)));
        for (const key of narrowed.keys) {
          if (!fullNames.has(key)) {
            problems.push(`${label} asks for "${key}", which ${narrowed.source} does not have`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  }, 120_000);

  it("keeps the flooded list honest: every name in it is a real table", () => {
    const labels = new Set(all.map((t) => `${t.page}: ${t.name ?? "?"}`));
    for (const label of flooded) expect(labels, `"${label}" is not a table`).toContain(label);
  });
});

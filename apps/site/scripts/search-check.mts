// Searches the built site's index the way the browser does (the dialog's own client: Fumadocs'
// Orama static client against /api/search, plus src/lib/search-rank.ts) and checks that each query puts the expected page first. Run against a started
// build, like check:pages:
//   tsx scripts/search-check.mts [--base=http://127.0.0.1:3000] [--verbose]
// Every component page must be found by its own name (read from the pages, so a new component is
// covered with no edit here), plus the task phrases below. See PAZM-141.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSearchClient } from "../src/lib/search-client";

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const base = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const verbose = process.argv.includes("--verbose");

const componentsDir = join(import.meta.dirname, "..", "content", "docs", "components");
const componentCases = readdirSync(componentsDir)
  .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
  .map((file) => {
    const title = readFileSync(join(componentsDir, file), "utf8").match(/^title:\s*(.+)$/m)?.[1];
    if (!title) throw new Error(`${file} has no title`);
    return [title.trim(), `/docs/components/${file.replace(/\.mdx$/, "")}`];
  });

// What someone types when they know the job but not the component's name. A list means any of
// those pages is a right answer.
const taskCases: [string, string | string[]][] = [
  ["focus trap", "/docs/components/modal"],
  ["dialog", "/docs/components/modal"],
  ["dropdown", "/docs/components/menu"],
  ["tooltip", "/docs/components/floating"],
  ["notification", "/docs/components/toast"],
  ["confirm delete", "/docs/examples/confirm-delete-flow"],
  ["dark mode", ["/docs/guide/theming", "/docs/guide/theming-quickstart"]],
  ["design tokens", "/docs/guide/tokens"],
  ["server components", "/docs/guide/server-components"],
  ["install next.js", "/docs/guide/install-nextjs"],
  ["shadcn", "/docs/guide/shadcn-registry"],
];

const client = createSearchClient(`${base}/api/search`);
const pageOf = (url: string) => url.split("#")[0];

const failures: string[] = [];
for (const [query, expected] of [...componentCases, ...taskCases] as [
  string,
  string | string[],
][]) {
  const results = await client.search(query);
  const pages = [...new Set(results.map((r) => pageOf(r.url)))];
  const ok = [expected].flat().includes(pages[0]);
  if (!ok)
    failures.push(
      `"${query}": expected ${[expected].flat().join(" or ")}, got ${pages.slice(0, 3).join(", ") || "nothing"}`,
    );
  if (verbose || !ok)
    console.log(`${ok ? "  ok  " : "  FAIL"} "${query}" -> ${pages.slice(0, 3).join(", ")}`);
}

// The guard can fail: nonsense must find nothing.
const nonsense = await client.search("qzxv-no-such-thing");
if (nonsense.length > 0) failures.push(`nonsense query returned ${nonsense.length} results`);

const total = componentCases.length + taskCases.length;
console.log(`\n${total - failures.length}/${total} queries put the expected page first`);
if (failures.length > 0) {
  console.error(`\nsearch check FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

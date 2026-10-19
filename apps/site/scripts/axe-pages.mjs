// Runs axe over the rendered docs pages in a real browser, in light and dark mode.
//
//   node scripts/axe-pages.mjs [--base=http://127.0.0.1:3000] [--only=docs/guide] [--concurrency=4]
//                              [--no-known] [--json]
//
// The demo tests run axe on each demo in jsdom, which has no layout engine, so they cannot see
// colour contrast, the landmarks of the whole page, or the docs chrome (sidebar, search, table of
// contents). This does. The pages come from the site's own sitemap, so a new page is checked without
// anyone listing it. It needs a built, running site (`next start`) and Chrome.
//
// Exit status: 1 for a violation that is not in a11y-known-issues.json, or for a known issue that no
// longer occurs (remove it), so the list of things we live with can only shrink.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { describe, splitKnown, validateKnown } from "./axe-report.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const knownFile = new URL("../a11y-known-issues.json", import.meta.url);

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
// Git Bash turns an argument that starts with "/" into a Windows path, so the leading slash is optional.
const only = `/${arg("only", "").replace(/^\//, "")}`.replace(/^\/$/, "");
const asJson = process.argv.includes("--json");
const useKnown = !process.argv.includes("--no-known");
const CONCURRENCY = Number(arg("concurrency", "4"));
const THEMES = ["light", "dark"];
// Everything WCAG 2.2 AA asks of a page, plus axe's best practices (landmarks, heading order).
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Every page in the sitemap, as a path on the running site. */
async function pages() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return [...new Set(paths)].filter((p) => p.startsWith(only)).sort();
}

async function check(browser, path, theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(
      (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
      TAGS,
    );
    return results.violations.map((v) => ({
      page: path,
      theme,
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 400) })),
    }));
  } finally {
    await context.close();
  }
}

async function main() {
  const list = await pages();
  if (list.length === 0) throw new Error(`no pages found in ${base}/sitemap.xml`);
  const known = useKnown ? validateKnown(JSON.parse(readFileSync(knownFile, "utf8"))) : [];
  const browser = await chromium.launch({ channel: "chrome" });
  const jobs = list.flatMap((path) => THEMES.map((theme) => [path, theme]));
  const found = [];
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (next < jobs.length) {
          const [path, theme] = jobs[next++];
          found.push(...(await check(browser, path, theme)));
        }
      }),
    );
  } finally {
    await browser.close();
  }

  const split = splitKnown(found, known);
  const { unexpected, excused } = split;
  // A filtered run only sees some pages, so it cannot tell that a known issue has gone.
  const unused = only === "" ? split.unused : [];
  if (asJson) {
    console.log(JSON.stringify({ pages: list.length, unexpected, excused, unused }, null, 2));
  } else {
    console.log(
      `${list.length} pages x ${THEMES.length} themes: ${unexpected.length} violation(s), ${excused} node(s) excused by a11y-known-issues.json`,
    );
    if (unexpected.length > 0) console.log(`\n${describe(unexpected)}`);
    for (const issue of unused) {
      console.log(
        `\nA known issue no longer occurs, remove it from a11y-known-issues.json: ${issue.rule} / ${issue.htmlIncludes}`,
      );
    }
  }
  if (unexpected.length > 0 || unused.length > 0) process.exit(1);
}

await main();

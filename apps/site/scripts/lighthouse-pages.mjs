// Runs Lighthouse (mobile profile) against the built docs site, several times per page, and compares
// the medians with lighthouse-budgets.json.
//
//   node scripts/lighthouse-pages.mjs [--base=http://127.0.0.1:3000] [--runs=3] [--only=docs/components/menu]
//                                     [--report-only] [--out=lighthouse-results.json]
//
// Needs a built, running site (`next start`) and Chrome. Lighthouse varies between runs, and more on
// a shared CI runner than on a laptop, so every number is a median, and each page has a limit (the
// worst we accept) apart from its target (what the project standards ask for). The check fails only
// for a page that is past its limit; a missed target is reported. See lighthouse-report.mjs.
//
// Time to Interactive is not measured: Lighthouse removed it in version 10. Total Blocking Time is
// the lab metric that replaced it.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { evaluate, summarise, table, validateBudgets } from "./lighthouse-report.mjs";

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
// Git Bash turns an argument that starts with "/" into a Windows path, so the leading slash is optional.
const only = arg("only", "").replace(/^\//, "");
const reportOnly = process.argv.includes("--report-only");
const out = arg("out", "lighthouse-results.json");
const budgets = validateBudgets(
  JSON.parse(readFileSync(new URL("../lighthouse-budgets.json", import.meta.url), "utf8")),
);
const runs = Number(arg("runs", String(budgets.runs)));

/** The numbers one Lighthouse run reports, in the units the budgets use. */
function read(lhr) {
  const audit = (id) => lhr.audits[id]?.numericValue;
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
    fcpMs: audit("first-contentful-paint"),
    lcpMs: audit("largest-contentful-paint"),
    cls: audit("cumulative-layout-shift"),
    tbtMs: audit("total-blocking-time"),
  };
}

async function measure(chrome, url) {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  if (!result) throw new Error(`Lighthouse returned nothing for ${url}`);
  if (result.lhr.runtimeError) throw new Error(`${url}: ${result.lhr.runtimeError.message}`);
  return read(result.lhr);
}

async function main() {
  const pages = budgets.pages.filter((p) => p.path.replace(/^\//, "").startsWith(only));
  if (pages.length === 0) throw new Error(`no page in lighthouse-budgets.json matches "${only}"`);
  const chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
  const results = [];
  try {
    for (const page of pages) {
      const taken = [];
      for (let i = 0; i < runs; i++) {
        taken.push(await measure(chrome, `${base}${page.path}`));
        console.log(
          `  ${page.path} run ${i + 1}/${runs}: performance ${taken[i].performance}, LCP ${Math.round(taken[i].lcpMs)} ms`,
        );
      }
      const summary = summarise(taken);
      results.push({ page, taken, summary, evaluation: evaluate(summary, page) });
    }
  } finally {
    await chrome.kill();
  }

  const markdown = [
    "## Lighthouse (mobile, medians)",
    "",
    ...results.flatMap((r) => [table(r.page.path, runs, r.evaluation), ""]),
    "",
    "Time to Interactive is not measured: Lighthouse dropped it in version 10. Total Blocking Time replaces it.",
  ].join("\n");
  console.log(`\n${markdown}`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  writeFileSync(
    out,
    JSON.stringify(
      results.map(({ page, taken, summary }) => ({ path: page.path, taken, summary })),
      null,
      2,
    ),
  );

  const failed = results.flatMap((r) =>
    r.evaluation.failed.map((row) => `${r.page.path} ${row.metric}`),
  );
  if (failed.length > 0) {
    console.error(`\nPast the limit: ${failed.join(", ")}`);
    if (!reportOnly) process.exit(1);
  }
}

await main();

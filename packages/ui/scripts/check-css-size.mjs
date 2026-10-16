// size-limit cannot bundle CSS, so the stylesheet is gzip-checked here.
// Budget is in kB (gzip, level 9); override with CSS_BUDGET_KB to test the check itself.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { cssFiles } from "./css-files.mjs";

const budgetKb = Number(process.env.CSS_BUDGET_KB ?? 5.5);
// styles.css imports tokens.css and motion.css, so the cost of taking styles.css is all of them.
const css = Buffer.concat(
  cssFiles().map((name) => readFileSync(new URL(`../dist/${name}`, import.meta.url))),
);
const sizeKb = gzipSync(css, { level: 9 }).length / 1000;

console.log(
  `@azmr/ui styles.css + its imports  ${sizeKb.toFixed(2)} kB gzip (budget ${budgetKb} kB)`,
);
if (sizeKb > budgetKb) {
  console.error(`styles.css exceeds its budget by ${(sizeKb - budgetKb).toFixed(2)} kB`);
  process.exit(1);
}

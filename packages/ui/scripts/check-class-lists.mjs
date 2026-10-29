// Post-build check of the class lists (dist/classes*.css), run by `pnpm size`:
//   1. classes.css generates exactly the rules the old `@source "./**/*.js"` scan of dist did, so
//      the generator cannot silently drop a class (a Tailwind or tsup change would show up here).
//   2. An app that lists only Button and Input stays within a gzip budget and gets none of another
//      component's rules: the point of the lists (PAZM-162).
// Automatic source detection is off (`source(none)`), so only the sources named here count.
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";

const DIST = join(import.meta.dirname, "..", "dist").replaceAll("\\", "/");
const budgetKb = Number(process.env.BUTTON_INPUT_CSS_BUDGET_KB ?? 6.5);

const compile = async (extra) =>
  (
    await postcss([tailwindcss()]).process(
      `@import "tailwindcss" source(none);\n@import "${DIST}/tokens.css";\n${extra}`,
      { from: `${DIST}/check.css` },
    )
  ).css;
const selectors = (css) =>
  new Set([...css.matchAll(/(?:^|[\n}])\s*(\.[^{}\n]+)\{/g)].map((m) => m[1].trim()));

const problems = [];

const scanned = selectors(await compile(`@source "${DIST}/**/*.js";`));
const listed = selectors(await compile(`@import "${DIST}/classes.css";`));
const missing = [...scanned].filter((s) => !listed.has(s));
const extra = [...listed].filter((s) => !scanned.has(s));
if (missing.length > 0)
  problems.push(`classes.css misses ${missing.length}: ${missing.slice(0, 5).join(" ")}`);
if (extra.length > 0)
  problems.push(`classes.css adds ${extra.length}: ${extra.slice(0, 5).join(" ")}`);

const buttonInput = await compile(
  `@import "${DIST}/classes/button.css";\n@import "${DIST}/classes/input.css";`,
);
const sizeKb = gzipSync(buttonInput, { level: 9 }).length / 1000;
// Classes only toast and the drawer use; a Button + Input app must not generate them.
for (const foreign of ["z-\\(--z-toast\\)", "translate-x-\\(--drawer-swipe-movement-x\\)"]) {
  if (buttonInput.includes(`.${foreign}`)) problems.push(`Button + Input CSS contains .${foreign}`);
}
if (sizeKb > budgetKb) {
  problems.push(
    `Button + Input CSS is ${sizeKb.toFixed(2)} kB gzip, over its ${budgetKb} kB budget`,
  );
}

console.log(
  `class lists: classes.css = the dist scan (${listed.size} rules); Button + Input ${sizeKb.toFixed(2)} kB gzip (budget ${budgetKb} kB)`,
);
if (problems.length > 0) {
  console.error(`check-class-lists failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}

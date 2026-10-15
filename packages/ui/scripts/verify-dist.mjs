// Post-build checks on dist/. Fails the build when the packaging contract breaks:
//   - every client entry starts with a "use client" directive
//   - no server-safe entry has one
//   - every entry has JS + type declarations
//   - the package.json "exports" map matches the entry list exactly
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const entries = JSON.parse(read("../build/entries.json"));
const pkg = JSON.parse(read("../package.json"));
const problems = [];

const stripLeadingComments = (code) =>
  code.replace(/^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*/, "").trimStart();
const hasDirective = (code) => /^["']use client["'];?/.test(stripLeadingComments(code));
const subpath = (name) => (name === "index" ? "." : `./${name}`);

for (const [kind, map] of Object.entries(entries)) {
  for (const name of Object.keys(map)) {
    const js = new URL(`../dist/${name}.js`, import.meta.url);
    const dts = new URL(`../dist/${name}.d.ts`, import.meta.url);
    if (!existsSync(js) || !existsSync(dts)) {
      problems.push(`dist/${name}.js or dist/${name}.d.ts is missing`);
      continue;
    }
    const withDirective = hasDirective(readFileSync(js, "utf8"));
    if (kind === "client" && !withDirective)
      problems.push(`client entry "${name}" lacks "use client"`);
    if (kind === "server" && withDirective)
      problems.push(`server-safe entry "${name}" must not have "use client"`);
  }
}

const expected = new Set(
  [...Object.keys(entries.client), ...Object.keys(entries.server)].map(subpath),
);
const actual = new Set(Object.keys(pkg.exports));
for (const s of expected)
  if (!actual.has(s)) problems.push(`package.json exports is missing "${s}"`);
for (const s of actual)
  if (!expected.has(s)) problems.push(`package.json exports has "${s}" but no build entry`);

if (problems.length > 0) {
  console.error(`verify-dist failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`verify-dist ok (${expected.size} entries: ${[...expected].join(", ")})`);

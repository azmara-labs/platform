// Post-build checks on dist/. Fails the build when the packaging contract breaks:
//   - every client entry starts with a "use client" directive
//   - no server entry (server or serverComponents) has one
//   - "server" entries (and every chunk they reach) import no React at all
//   - "serverComponents" entries (and their chunks) use stateless React only: no hooks, no context
//   - every entry has JS + type declarations
//   - the package.json "exports" map matches the entry list exactly
// The rules live in dist-rules.mjs so they can be unit-tested.
import { existsSync, readFileSync } from "node:fs";
import {
  hasUseClientDirective,
  relativeImports,
  resolveImport,
  serverComponentProblems,
  serverPureProblems,
} from "./dist-rules.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const entries = JSON.parse(read("../build/entries.json"));
const pkg = JSON.parse(read("../package.json"));
const problems = [];

// Everything a server entry can reach through relative imports (shared chunks included): a
// Server Component importing it must not pull a client runtime in through a chunk.
function reachableFiles(startName) {
  const seen = new Set();
  const queue = [`${startName}.js`];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const url = new URL(`../dist/${file}`, import.meta.url);
    if (!existsSync(url)) continue;
    for (const specifier of relativeImports(readFileSync(url, "utf8"))) {
      queue.push(resolveImport(file, specifier));
    }
  }
  return seen;
}

const subpath = (name) => (name === "index" ? "." : `./${name}`);
const KINDS = ["client", "serverComponents", "server"];
const rulesFor = { server: serverPureProblems, serverComponents: serverComponentProblems };

for (const kind of KINDS) {
  for (const name of Object.keys(entries[kind] ?? {})) {
    const js = new URL(`../dist/${name}.js`, import.meta.url);
    const dts = new URL(`../dist/${name}.d.ts`, import.meta.url);
    if (!existsSync(js) || !existsSync(dts)) {
      problems.push(`dist/${name}.js or dist/${name}.d.ts is missing`);
      continue;
    }
    const withDirective = hasUseClientDirective(readFileSync(js, "utf8"));
    if (kind === "client" && !withDirective)
      problems.push(`client entry "${name}" lacks "use client"`);
    if (kind !== "client" && withDirective)
      problems.push(`${kind} entry "${name}" must not have "use client"`);
    const rule = rulesFor[kind];
    if (rule) {
      for (const file of reachableFiles(name)) {
        const url = new URL(`../dist/${file}`, import.meta.url);
        if (!existsSync(url)) continue;
        for (const problem of rule(readFileSync(url, "utf8"))) {
          problems.push(`${kind} entry "${name}": ${problem} (dist/${file})`);
        }
      }
    }
  }
}

// The stylesheet is copied, not bundled: it must exist, be exported, and carry the
// @source rule that lets Tailwind v4 scan our classes from node_modules.
const cssUrl = new URL("../dist/styles.css", import.meta.url);
if (!existsSync(cssUrl)) problems.push("dist/styles.css is missing");
else if (!/@source\s+["'][^"']+["']/.test(readFileSync(cssUrl, "utf8"))) {
  problems.push('dist/styles.css has no @source rule (Tailwind would not scan "node_modules")');
}

const expected = new Set(KINDS.flatMap((kind) => Object.keys(entries[kind] ?? {})).map(subpath));
expected.add("./styles.css");
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

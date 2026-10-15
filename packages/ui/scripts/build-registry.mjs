// Builds the shadcn-compatible registry from the package source.
//
//   node scripts/build-registry.mjs [--out <dir>]
//
// 1. Reads registry/items.json (what each item is, which source files it ships, how their
//    relative imports map to a consumer's aliases).
// 2. Writes the rewritten source and a registry.json into registry/.generated/ (gitignored).
// 3. Runs the official `shadcn build`, which inlines the files into one JSON per item.
// 4. Verifies the output: no relative imports, no leftover package paths.
//
// The shipped code is generated from the same files the package builds, so the registry cannot
// drift from the package. Served at https://platform.azmara.io/r/{name}.json.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildTokensItem } from "./registry-tokens.mjs";
import { relativeSpecifiers, rewriteImports } from "./registry-transform.mjs";

const root = resolve(import.meta.dirname, "..");
const outArg = process.argv.indexOf("--out");
const outDir = resolve(
  outArg > -1 ? (process.argv[outArg + 1] ?? "") : join(root, "registry", "out"),
);
const generated = join(root, "registry", ".generated");
const isWin = process.platform === "win32";

const definition = JSON.parse(readFileSync(join(root, "registry", "items.json"), "utf8"));

rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });

const fileItems = definition.items.map((item) => {
  const files = item.files.map((file) => {
    const source = readFileSync(join(root, file.from), "utf8");
    const code = rewriteImports(source, file.imports ?? {}, file.from, { strictUnused: true });
    const leftover = relativeSpecifiers(code);
    if (leftover.length > 0) throw new Error(`${file.from}: relative imports remain: ${leftover}`);
    const path = `files/${file.to}`;
    mkdirSync(dirname(join(generated, path)), { recursive: true });
    writeFileSync(join(generated, path), code);
    return { path, type: file.type };
  });
  const { files: _ignored, ...rest } = item;
  return { $schema: "https://ui.shadcn.com/schema/registry-item.json", ...rest, files };
});

// The tokens item is generated from tokens.css, so it cannot drift from the package.
const tokensItem = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  ...buildTokensItem(readFileSync(join(root, "src", "styles", "tokens.css"), "utf8")),
};
const items = [...fileItems, tokensItem];

writeFileSync(
  join(generated, "registry.json"),
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: definition.name,
      homepage: definition.homepage,
      items,
    },
    null,
    2,
  ),
);

mkdirSync(outDir, { recursive: true });
const build = spawnSync(
  "pnpm",
  [
    "exec",
    "shadcn",
    "build",
    join(generated, "registry.json"),
    "--output",
    outDir,
    "--cwd",
    generated,
  ],
  { cwd: root, shell: isWin, encoding: "utf8" },
);
if (build.status !== 0) {
  console.error(`${build.stdout}\n${build.stderr}`);
  process.exit(build.status ?? 1);
}

// Verify what was written, independently of the transform.
const problems = [];
for (const item of items) {
  let json;
  try {
    json = JSON.parse(readFileSync(join(outDir, `${item.name}.json`), "utf8"));
  } catch (error) {
    problems.push(`${item.name}.json was not produced: ${error.message}`);
    continue;
  }
  if (json.name !== item.name) problems.push(`${item.name}.json has name "${json.name}"`);
  for (const file of json.files ?? []) {
    if (typeof file.content !== "string" || file.content.length === 0) {
      problems.push(`${item.name}: ${file.path} has no content`);
      continue;
    }
    const relative = relativeSpecifiers(file.content);
    if (relative.length > 0) problems.push(`${item.name}: ${file.path} imports ${relative}`);
  }
}
if (problems.length > 0) {
  console.error(`registry verification failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`registry built: ${items.map((i) => i.name).join(", ")} -> ${outDir}`);

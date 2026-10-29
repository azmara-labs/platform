// Writes the per-entry class lists after tsup has built dist/:
//   dist/classes/<entry>.css  the Tailwind classes one entry uses (its chunks included)
//   dist/classes.css          every entry's classes: what the old `@source "./**/*.js"` scan found
//
// Candidates come from Tailwind's own scanner (@tailwindcss/oxide, the engine behind @source),
// then Tailwind's design system, loaded with our tokens, keeps the ones that produce CSS. So a
// list holds exactly what a scan of that entry's files would have generated, and nothing that
// merely looks like a class (identifiers, prop names).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { classListCss, reachableFiles } from "./class-lists.mjs";

const UI = join(import.meta.dirname, "..");
const DIST = join(UI, "dist");
const require = createRequire(import.meta.url);
const entries = JSON.parse(readFileSync(join(UI, "build", "entries.json"), "utf8"));
const names = ["client", "serverComponents", "server"].flatMap((kind) =>
  Object.keys(entries[kind] ?? {}),
);

const read = (file) => {
  try {
    return readFileSync(join(DIST, file), "utf8");
  } catch {
    return undefined;
  }
};

// Our tokens decide which candidates are real utilities (bg-background, shadow-elevation-2, ...).
const designSystem = await __unstable__loadDesignSystem(
  '@import "tailwindcss";\n@import "./tokens.css";',
  {
    base: join(UI, "src", "styles"),
    async loadStylesheet(id, base) {
      const path =
        id === "tailwindcss"
          ? require.resolve("tailwindcss/index.css")
          : require.resolve(id.startsWith(".") ? join(base, id) : id);
      return { path, base: dirname(path), content: readFileSync(path, "utf8") };
    },
  },
);

// A new Scanner per entry: scanFiles() only returns candidates that scanner has not seen yet, so a
// shared one would hand every chunk's classes to the first entry that reaches it.
const utilitiesIn = (files) => {
  const candidates = new Scanner({}).scanFiles(
    [...files].map((file) => ({ content: read(file), extension: "js" })),
  );
  const css = designSystem.candidatesToCss(candidates);
  return candidates.filter((_, i) => css[i]);
};

mkdirSync(join(DIST, "classes"), { recursive: true });
const all = new Set();
const counts = [];
for (const name of names) {
  const classes = utilitiesIn(reachableFiles(`${name}.js`, read));
  for (const c of classes) all.add(c);
  const path = join(DIST, "classes", `${name}.css`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, classListCss(name, classes));
  counts.push(`${name} ${classes.length}`);
}
writeFileSync(join(DIST, "classes.css"), classListCss("every entry", [...all]));
console.log(`class lists: ${all.size} classes in all; ${counts.join(", ")}`);

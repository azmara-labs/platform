// Writes every demo's full source to public/demos/<name>.txt (for "Copy full source" and "Open as
// text") and, highlighted, to public/demos/<name>.html (for "Show full source"). A component page
// renders only an excerpt of each long demo (src/lib/demo-preview.ts), so the full file is fetched
// only when someone asks for it (PAZM-143). The HTML comes from Fumadocs' own highlighter with the
// same options as ServerCodeBlock, so it looks exactly like the code blocks on the page.
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { highlight } from "fumadocs-core/highlight";
import { renderToStaticMarkup } from "react-dom/server";

const siteDir = join(import.meta.dirname, "..");
const demosDir = join(siteDir, "src", "demos");
const outDir = join(siteDir, "public", "demos");

function demoFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return demoFiles(path);
    return entry.endsWith(".demo.tsx") ? [path] : [];
  });
}

rmSync(outDir, { recursive: true, force: true });
const files = demoFiles(demosDir);
for (const file of files) {
  const name = relative(demosDir, file)
    .split("\\")
    .join("/")
    .replace(/\.demo\.tsx$/, "");
  const source = (await readFile(file, "utf8")).trim();
  // Shiki makes its <pre> focusable; the page's wrapper is the scroll region and takes focus, so
  // drop the pre's tab stop to avoid two in a row.
  const html = renderToStaticMarkup(
    await highlight(source, { lang: "tsx", defaultColor: false }),
  ).replace(/^<pre([^>]*?) tabindex="0"/, "<pre$1");
  mkdirSync(dirname(join(outDir, name)), { recursive: true });
  writeFileSync(join(outDir, `${name}.txt`), `${source}\n`);
  writeFileSync(join(outDir, `${name}.html`), html);
}
console.log(
  `[build-demo-sources] wrote the full source of ${files.length} demos under public/demos`,
);

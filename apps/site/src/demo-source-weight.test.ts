import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { demoPreview } from "./lib/demo-preview";

// A long demo's full source must not be in the page: only its excerpt, with the file fetched on
// request from public/demos (PAZM-143). These checks need `pnpm build`, which also generates
// public/demos, like the landing page budget in landing-weight.test.ts.

const siteDir = join(import.meta.dirname, "..");
const demosDir = join(siteDir, "src", "demos");
const builtApp = join(siteDir, ".next", "server", "app");
const isBuilt = existsSync(join(builtApp, "docs", "components", "menu.html"));

function demoFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return demoFiles(path);
    return entry.endsWith(".demo.tsx") ? [path] : [];
  });
}

const demos = demoFiles(demosDir).map((file) => {
  const source = readFileSync(file, "utf8");
  return {
    name: relative(demosDir, file)
      .split("\\")
      .join("/")
      .replace(/\.demo\.tsx$/, ""),
    source,
    preview: demoPreview(source),
  };
});

/** Which built page shows each demo, from the `<Demo name>` tags in the content. */
function pagesUsing(name: string): string[] {
  const contentDir = join(siteDir, "content", "docs");
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (
        entry.endsWith(".mdx") &&
        readFileSync(path, "utf8").includes(`<Demo name="${name}"`)
      ) {
        const route = relative(contentDir, path)
          .split("\\")
          .join("/")
          .replace(/(\/index)?\.mdx$/, "");
        pages.push(join(builtApp, "docs", `${route || "index"}.html`));
      }
    }
  };
  walk(contentDir);
  return pages;
}

/** The page's visible text and payload, with tags and highlighting spans removed. */
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\\u003c/g, "<")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");

describe.skipIf(!isBuilt)("demo source on built pages (needs a build)", () => {
  it("covers the demos (guards against checking nothing)", () => {
    expect(demos.filter((d) => d.preview.collapsed).length).toBeGreaterThan(30);
  });

  it.each(demos.filter((d) => d.preview.collapsed))(
    "$name: the page has the excerpt but not the full file, which is generated for on-demand loading",
    ({ name, source, preview }) => {
      const signature = /export default function \w+\(\)/.exec(source)?.[0];
      expect(signature, "every demo has a named default export").toBeDefined();
      const pages = pagesUsing(name).filter(existsSync);
      expect(pages.length, `a built page shows ${name}`).toBeGreaterThan(0);
      for (const page of pages) {
        const text = textOf(readFileSync(page, "utf8"));
        expect(text, `${page} holds the full source of ${name}`).not.toContain(signature);
        expect(text).toContain(preview.code.split("\n")[0]?.trim().slice(0, 20));
      }
      for (const ext of ["txt", "html"]) {
        expect(
          existsSync(join(siteDir, "public", "demos", `${name}.${ext}`)),
          `${name}.${ext}`,
        ).toBe(true);
      }
    },
  );
});

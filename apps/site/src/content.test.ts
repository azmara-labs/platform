import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { type BrokenLink, checkLinks, extractLinks, stripCode } from "./lib/content-links";

// Content checks that run on every PR: no broken internal links or anchors, and every public
// entry point of @azmr/ui has a docs page that shows its import path.

const siteDir = join(import.meta.dirname, "..");
const contentDir = join(siteDir, "content", "docs");
const srcDir = join(siteDir, "src");
const packagesDir = join(siteDir, "..", "..", "packages");

function walk(dir: string, match: RegExp, skip: RegExp = /^$/, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (skip.test(entry)) continue;
    if (statSync(full).isDirectory()) walk(full, match, skip, out);
    else if (match.test(entry)) out.push(full);
  }
  return out;
}

const posix = (path: string) => path.replaceAll("\\", "/");

// The changelog pages are generated from each package's CHANGELOG.md at build time and are not
// committed, so they may be absent locally. Their routes are known from the package list, and
// their contents (commit text) are not link-checked.
const changelogRoutes = [
  "/docs/changelog",
  ...readdirSync(packagesDir)
    .filter((name) => statSync(join(packagesDir, name)).isDirectory())
    .map((name) => `/docs/changelog/${name}`),
];

// Pages generated at build time (scripts/build-*.ts) and not committed, so they may be absent
// locally. Other pages may link to them; the generators have their own tests.
const generatedRoutes = ["/docs/guide/tokens"];

function routeOf(file: string): string {
  const parts = posix(relative(contentDir, file))
    .replace(/\.mdx$/, "")
    .split("/");
  if (parts.at(-1) === "index") parts.pop();
  return parts.length === 0 ? "/docs" : `/docs/${parts.join("/")}`;
}

const mdxFiles = walk(contentDir, /\.mdx$/, /^changelog$/);
const pages = new Map(mdxFiles.map((file) => [routeOf(file), readFileSync(file, "utf8")]));

const appRoutes = walk(join(srcDir, "app"), /^page\.tsx$/)
  .map((file) => posix(relative(join(srcDir, "app"), file)).replace(/\/?page\.tsx$/, ""))
  .filter((route) => !route.includes("["))
  .map((route) => (route === "" ? "/" : `/${route}`));

const routes = new Set([...pages.keys(), ...changelogRoutes, ...generatedRoutes, ...appRoutes]);

describe("docs content", () => {
  it("finds the pages and routes (guards against scanning nothing)", () => {
    expect(pages.size).toBeGreaterThan(20);
    expect(routes.has("/docs/components/button")).toBe(true);
    expect(routes.has("/")).toBe(true);
  });

  it("has no broken internal links or anchors in the MDX pages", () => {
    const broken: BrokenLink[] = [];
    let checked = 0;
    for (const [route, source] of pages) {
      const links = extractLinks(source);
      checked += links.length;
      const from = `${route.replace(/^\/docs\/?/, "") || "index"}.mdx`;
      broken.push(...checkLinks(from, links, routes, pages, route));
    }
    expect(checked).toBeGreaterThan(15);
    expect(broken).toEqual([]);
  });

  it("has no broken /docs links in the site's own components and pages", () => {
    const files = walk(srcDir, /\.tsx?$/, /^(demos|node_modules)$/).filter(
      (file) => !/\.test\.tsx?$/.test(file),
    );
    const broken: BrokenLink[] = [];
    for (const file of files) {
      const source = stripCode(readFileSync(file, "utf8"));
      const links = [...source.matchAll(/["'`](\/docs[^"'`\s${}]*)["'`]/g)].map(
        (m) => m[1] as string,
      );
      broken.push(
        ...checkLinks(posix(relative(siteDir, file)), links, routes, pages, "/docs").filter(
          (b) => b.reason !== "relative link: use an absolute path such as /docs/...",
        ),
      );
    }
    expect(broken).toEqual([]);
  });
});

describe("@azmr/ui entry points have docs", () => {
  const entries = JSON.parse(
    readFileSync(join(packagesDir, "ui", "build", "entries.json"), "utf8"),
  ) as Record<string, Record<string, string>>;
  const entryNames = Object.values(entries).flatMap((group) => Object.keys(group));

  // Entries documented on a page with a different name.
  const pageFor: Record<string, string> = {
    transition: "motion",
    presets: "motion",
    icons: "icon",
    "icons/lucide": "icon",
  };

  // Entries with no page of their own, each with the reason. Remove a line when its page lands.
  const undocumented: Record<string, string> = {
    index: "the package root re-exports the other entries",
    hooks: "no hooks reference page yet",
    react: "no reference page for the signals bridge yet",
    lib: "internal helpers (cn and friends) are not a documented surface yet",
    theme: "createTheme is documented in the theming reference (PAZM-127)",
    "icons/mui-map": "migration map, not user-facing",
    "typography/mui-map": "migration map, not user-facing",
    "layout/mui-map": "migration map, not user-facing",
  };

  it("lists the entries (guards against scanning nothing)", () => {
    expect(entryNames.length).toBeGreaterThan(20);
  });

  it("keeps the exception lists honest: every name in them is a real entry", () => {
    for (const name of [...Object.keys(pageFor), ...Object.keys(undocumented)]) {
      expect(entryNames, `"${name}" is not an entry in build/entries.json`).toContain(name);
    }
    for (const name of Object.keys(undocumented)) {
      expect(pageFor[name], `"${name}" is both documented and excused`).toBeUndefined();
    }
  });

  it("gives every other entry a component page that shows its import path", () => {
    const problems: string[] = [];
    for (const name of entryNames) {
      if (name in undocumented) continue;
      const slug = pageFor[name] ?? name;
      const source = pages.get(`/docs/components/${slug}`);
      if (source === undefined) {
        problems.push(`@azmr/ui/${name}: no page at /docs/components/${slug}`);
        continue;
      }
      const importPath = new RegExp(`@azmr/ui/${name.replace("/", "\\/")}(?![\\w/-])`);
      if (!importPath.test(source)) {
        problems.push(`@azmr/ui/${name}: /docs/components/${slug} never shows this import path`);
      }
    }
    expect(problems).toEqual([]);
  });
});

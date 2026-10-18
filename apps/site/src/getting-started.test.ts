import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureFilePath, fixturesRoot, isFixtureFile, languageOf } from "./lib/fixture-file";

// The getting-started guides show the real files of small apps that CI installs against the packed
// package, builds and inspects (packages/ui/scripts/verify-guides.mjs). These tests keep the guides
// and those apps tied together: a guide cannot name a file that is not there, a file cannot be
// added to an app without the guide showing it (or a stated reason), and the Server Components
// guide cannot disagree with the package's entry list.

const siteDir = join(import.meta.dirname, "..");
const root = join(siteDir, "..", "..");
const guidesDir = join(siteDir, "content", "docs", "guide");
const fixtures = fixturesRoot(siteDir);

const FRAMEWORKS = [
  { fixture: "next", page: "install-nextjs", chooser: "Next.js" },
  { fixture: "vite", page: "install-vite", chooser: "Vite" },
  { fixture: "react-router", page: "install-react-router", chooser: "React Router" },
  { fixture: "esbuild", page: "install-react", chooser: "plain React" },
] as const;

const read = (file: string) => readFileSync(file, "utf8");
const guide = (page: string) => read(join(guidesDir, `${page}.mdx`));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".react-router", "build", "dist"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const fixtureFiles = walk(fixtures).map((f) => relative(fixtures, f).replaceAll("\\", "/"));
const referenced = (page: string) =>
  [...guide(page).matchAll(/<FixtureFile\s+file="([^"]+)"/g)].map((m) => m[1] as string);

describe("fixture file names", () => {
  it("accept a framework folder and a path inside it", () => {
    expect(isFixtureFile("next/app/page.tsx")).toBe(true);
    expect(isFixtureFile("react-router/app/routes/home.tsx")).toBe(true);
  });

  it.each([
    "../package.json",
    "next/../../package.json",
    "/etc/passwd",
    "next\\app\\page.tsx",
    "C:/Windows/win.ini",
    "next/",
    "next",
    "",
    "next/app//page.tsx",
    "next/%2e%2e/package.json",
  ])("reject %j", (name) => {
    expect(isFixtureFile(name)).toBe(false);
    expect(() => fixtureFilePath(fixtures, name)).toThrow(/Invalid fixture file/);
  });

  it("resolve inside the fixtures folder, and pick a code-block language", () => {
    const file = fixtureFilePath(fixtures, "next/app/page.tsx");
    expect(file.startsWith(fixtures)).toBe(true);
    expect(existsSync(file)).toBe(true);
    expect(languageOf("a.tsx")).toBe("tsx");
    expect(languageOf("postcss.config.mjs")).toBe("js");
    expect(languageOf("app.css")).toBe("css");
    expect(languageOf("README")).toBe("text");
  });
});

describe("the framework guides", () => {
  it("finds the fixtures and the guides (guards against scanning nothing)", () => {
    expect(fixtureFiles.length).toBeGreaterThan(30);
    for (const { fixture, page } of FRAMEWORKS) {
      expect(
        fixtureFiles.some((f) => f.startsWith(`${fixture}/`)),
        fixture,
      ).toBe(true);
      expect(referenced(page).length, page).toBeGreaterThanOrEqual(4);
    }
  });

  it("show only files that exist, from their own framework's fixture", () => {
    for (const { fixture, page } of FRAMEWORKS) {
      for (const file of referenced(page)) {
        expect(file.startsWith(`${fixture}/`), `${page} shows ${file}`).toBe(true);
        expect(existsSync(fixtureFilePath(fixtures, file)), `${page}: ${file} is missing`).toBe(
          true,
        );
      }
    }
  });

  // Files an app has that a reader does not need to be shown, each with the reason. Everything else
  // in a fixture must be shown by its guide, so a file cannot be added to the tested app without
  // the guide showing it.
  const notShown: Record<string, string> = {
    "next/package.json": "created by create-next-app; the guide installs the packages by command",
    "next/tsconfig.json": "created by create-next-app",
    "vite/package.json": "created by create-vite; the guide installs the packages by command",
    "vite/tsconfig.json": "created by create-vite",
    "vite/index.html": "created by create-vite",
    "react-router/package.json": "created by create-react-router",
    "react-router/tsconfig.json": "created by create-react-router",
    "react-router/react-router.config.ts": "created by create-react-router, unchanged",
    "react-router/app/routes.ts": "created by create-react-router, unchanged",
    "esbuild/tsconfig.json": "standard TypeScript settings for a React app",
  };

  it("keep the not-shown list honest: every entry is a real file that no guide shows", () => {
    const shown = new Set(FRAMEWORKS.flatMap(({ page }) => referenced(page)));
    for (const file of Object.keys(notShown)) {
      expect(fixtureFiles, `${file} is not a fixture file: remove it from the list`).toContain(
        file,
      );
      expect(shown.has(file), `${file} is shown now: remove it from the list`).toBe(false);
    }
  });

  it("show every other file of every fixture", () => {
    const shown = new Set(FRAMEWORKS.flatMap(({ page }) => referenced(page)));
    const missing = fixtureFiles.filter((file) => !shown.has(file) && !(file in notShown));
    expect(missing, "add these to the guide, or to the not-shown list with a reason").toEqual([]);
  });

  it("use the same first component and theme toggle in every framework, so the guides agree", () => {
    const strip = (source: string) => source.replace(/^"use client";\n\n/, "").trim();
    const app = (file: string) => strip(read(join(fixtures, file)));
    expect(app("vite/src/App.tsx")).toBe(app("esbuild/src/App.tsx"));
    const toggles = [
      "next/app/theme-toggle.tsx",
      "vite/src/theme-toggle.tsx",
      "react-router/app/theme-toggle.tsx",
      "esbuild/src/theme-toggle.tsx",
    ].map(app);
    expect(new Set(toggles).size).toBe(1);
    for (const file of [
      "next/app/page.tsx",
      "vite/src/App.tsx",
      "react-router/app/routes/home.tsx",
      "esbuild/src/App.tsx",
    ]) {
      expect(read(join(fixtures, file)), file).toContain("<Button>Say hello</Button>");
    }
  });

  it("import the stylesheet the way the tailwind guide says, in every framework", () => {
    for (const file of [
      "next/app/globals.css",
      "vite/src/index.css",
      "react-router/app/app.css",
      "esbuild/src/app.css",
    ]) {
      expect(read(join(fixtures, file)).trim(), file).toBe(
        '@import "tailwindcss";\n@import "@azmr/ui/styles.css";',
      );
    }
    expect(guide("tailwind")).toContain('@import "@azmr/ui/styles.css";');
  });

  it("are listed on the Installation page, and in the sidebar after it, before the concepts", () => {
    const installation = guide("installation");
    for (const { page, chooser } of FRAMEWORKS) {
      expect(installation, page).toContain(`(/docs/guide/${page})`);
      expect(installation, chooser).toContain(chooser);
    }
    const meta = JSON.parse(read(join(guidesDir, "meta.json"))) as { pages: string[] };
    const at = (name: string) => meta.pages.indexOf(name);
    for (const { page } of FRAMEWORKS) {
      expect(at(page), page).toBeGreaterThan(at("installation"));
      expect(at(page), page).toBeLessThan(at("---Concepts---"));
    }
    expect(at("server-components")).toBeGreaterThan(at("install-react"));
    expect(at("server-components")).toBeLessThan(at("---Concepts---"));
  });

  it("keep the repository setup on its own page", () => {
    expect(guide("monorepo-setup")).toContain("git clone");
    expect(guide("installation")).not.toContain("git clone");
  });
});

describe("the verification behind the guides", () => {
  const script = read(join(root, "packages", "ui", "scripts", "verify-guides.mjs"));
  const ci = read(join(root, ".github", "workflows", "ci.yml"));
  const uiPackage = JSON.parse(read(join(root, "packages", "ui", "package.json"))) as {
    scripts: Record<string, string>;
  };

  it("builds a fixture for every guide, and has a guide for every fixture", () => {
    const folders = readdirSync(fixtures).filter((f) => statSync(join(fixtures, f)).isDirectory());
    expect(folders.sort()).toEqual(FRAMEWORKS.map((f) => f.fixture).sort());
    for (const { fixture } of FRAMEWORKS) {
      expect(script, fixture).toMatch(new RegExp(`(^|\\s)"?${fixture}"?: \\{`, "m"));
    }
  });

  it("runs in CI on every change", () => {
    expect(uiPackage.scripts["verify:guides"]).toContain("verify-guides.mjs");
    expect(ci).toContain("pnpm --filter @azmr/ui verify:guides");
  });

  it("checks what each guide's 'What was tested' list says it checks", () => {
    expect(script).toContain("Tailwind scanned @azmr/ui in node_modules");
    expect(script).toContain("the server renders the Button and the label");
    expect(script).toContain("the guide's code type-checks");
    expect(script).toContain('data-theme="dark"');
    expect(script).toContain("--sabotage=no-source");
    for (const { page } of FRAMEWORKS) expect(guide(page), page).toContain("## What was tested");
  });
});

describe("the Server Components guide", () => {
  const page = guide("server-components");
  const entries = JSON.parse(read(join(root, "packages", "ui", "build", "entries.json"))) as Record<
    "client" | "serverComponents" | "server",
    Record<string, string>
  >;

  /** The import paths in the first column of the table under a heading. */
  function tableUnder(heading: string): string[] {
    const start = page.indexOf(`### ${heading}`);
    expect(start, `no "${heading}" section`).toBeGreaterThan(-1);
    const next = page.indexOf("\n## ", start);
    const end = [page.indexOf("\n### ", start + 4), next].filter((n) => n > -1);
    const section = page.slice(start, Math.min(...end, page.length));
    return [...section.matchAll(/^\| `(@azmr\/ui[^`]*)` \|/gm)].map((m) => m[1] as string);
  }
  const importPath = (name: string) => (name === "index" ? "@azmr/ui" : `@azmr/ui/${name}`);

  it("lists exactly the package's entries in each group, from build/entries.json", () => {
    for (const [group, heading] of [
      ["client", "Client entries"],
      ["serverComponents", "Server-safe components"],
      ["server", "Server-safe modules"],
    ] as const) {
      expect(tableUnder(heading).sort(), heading).toEqual(
        Object.keys(entries[group]).map(importPath).sort(),
      );
    }
  });

  it("shows an element-versus-function example that the Next.js page backs up", () => {
    expect(page).toContain("Event handlers cannot be passed to Client Component props");
    expect(page).toContain('<IconButton icon={<Icon icon={Plus} />} label="Add item" />');
    expect(guide("install-nextjs")).toContain("(/docs/guide/server-components)");
  });
});

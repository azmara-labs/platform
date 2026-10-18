import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTheme, htmlAttributes } from "@azmr/ui/theme";
import { describe, expect, it } from "vitest";
import { extractExamples, runExample } from "./lib/doc-examples";

// The second half of the getting-started pages: the theming quickstart, "Why @azmr/ui" and the
// shadcn registry guide. Each states facts about the package, so each is tied to the thing it
// describes: the quickstart's examples are run, the size table is compared with the budgets CI
// enforces, the list of what is missing fails when something on it is added, and the registry table
// is compared with the registry's source.

const siteDir = join(import.meta.dirname, "..");
const root = join(siteDir, "..", "..");
const uiDir = join(root, "packages", "ui");
const guide = (page: string) =>
  readFileSync(join(siteDir, "content", "docs", "guide", `${page}.mdx`), "utf8");
const read = (...parts: string[]) => readFileSync(join(...parts), "utf8");

describe("the theming quickstart", () => {
  const page = guide("theming-quickstart");
  const examples = extractExamples(page);

  it("has the examples it promises (guards against scanning nothing)", () => {
    expect(examples.map((e) => e.name)).toEqual(["primary", "density", "dark"]);
  });

  it.each(examples.map((e) => [e.name, e] as const))(
    "%s: shows the output the package returns",
    async (_name, example) => {
      expect(example.expected, `${example.name} has no // => line`).not.toBeUndefined();
      expect(await runExample(example, { createTheme, htmlAttributes })).toEqual(example.expected);
    },
  );

  it("links only to headings that exist in the pages it points at", () => {
    const theming = guide("theming");
    for (const anchor of ["what-it-guarantees", "apply-the-theme", "invalid-input"]) {
      expect(page, anchor).toContain(`/docs/guide/theming#${anchor}`);
      const heading = anchor.replaceAll("-", " ");
      expect(theming.toLowerCase(), anchor).toContain(
        `### ${heading}`.replace("### apply", "## apply"),
      );
    }
    for (const framework of [
      "install-nextjs",
      "install-vite",
      "install-react-router",
      "install-react",
    ]) {
      expect(page).toContain(`/docs/guide/${framework}#5-add-dark-mode`);
      expect(guide(framework), framework).toContain("## 5. Add dark mode");
    }
  });
});

describe("Why @azmr/ui", () => {
  const page = guide("why-azmr-ui");
  const sizeLimit = JSON.parse(read(uiDir, ".size-limit.json")) as {
    name: string;
    limit: string;
  }[];
  const entries = JSON.parse(read(uiDir, "build", "entries.json")) as Record<
    string,
    Record<string, string>
  >;
  const entryNames = Object.values(entries).flatMap((group) => Object.keys(group));

  it("quotes the size budgets CI enforces, not numbers of its own", () => {
    const rows = [...page.matchAll(/^\| `(@azmr\/ui\/[\w-]+)` \| (\d+(?:\.\d+)? kB) \|$/gm)];
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const [, name, limit] of rows) {
      const budget = sizeLimit.find(
        (entry) => entry.name === name || entry.name.startsWith(`${name} `),
      );
      expect(budget, `${name} has no budget in .size-limit.json`).toBeDefined();
      expect(budget?.limit, name).toBe(limit);
    }
  });

  it("quotes the stylesheet budget the CSS check enforces", () => {
    const script = read(uiDir, "scripts", "check-css-size.mjs");
    const budget = /CSS_BUDGET_KB \?\? ([\d.]+)/.exec(script)?.[1];
    expect(budget).toBeDefined();
    expect(page).toContain(`| ${budget} kB (gzip) |`);
  });

  it("says what is missing, and fails when it is added, so the page gets revisited", () => {
    const missing = [
      "select",
      "combobox",
      "checkbox",
      "radio",
      "switch",
      "slider",
      "textarea",
      "date",
    ];
    const present = entryNames.filter((name) => missing.some((word) => name.includes(word)));
    expect(
      present,
      "an entry now exists for something Why @azmr/ui lists as missing: update its 'What it is not (yet)' section",
    ).toEqual([]);
    expect(page).toContain(
      "There is no select, combobox, checkbox, radio group, switch, slider, textarea or date picker yet",
    );
    const table = read(siteDir, "content", "docs", "components", "table.mdx");
    expect(table).toContain("## Not a data grid");
    expect(page).toContain("**No data grid.**");
  });

  it("says the package is 0.x while it is", () => {
    const pkg = JSON.parse(read(uiDir, "package.json")) as { version: string };
    expect(pkg.version, "the package reached 1.0: update the 'Early' bullet").toMatch(/^0\./);
    expect(page).toContain("version 0.x");
  });

  it("names the migration maps that exist, and the components and guides it sends readers to", () => {
    for (const map of ["icons/mui-map", "typography/mui-map", "layout/mui-map"]) {
      expect(entryNames, map).toContain(map);
      expect(page).toContain(`@azmr/ui/${map}`);
    }
    for (const link of [
      "/docs/guide/accessibility",
      "/docs/guide/tokens",
      "/docs/guide/server-components",
      "/docs/guide/shadcn-registry",
      "/docs/guide/installation",
      "/docs/examples/data-table-page",
      "/docs/changelog/ui",
    ]) {
      expect(page, link).toContain(`](${link})`);
    }
  });

  it("compares with the three libraries and dates the comparison", () => {
    for (const name of ["MUI", "shadcn/ui", "Bootstrap"]) expect(page, name).toContain(name);
    expect(page).toContain("as of October 2026");
    expect(page).toContain("check their own documentation");
  });
});

describe("the shadcn registry guide", () => {
  const page = guide("shadcn-registry");
  const items = JSON.parse(read(uiDir, "registry", "items.json")) as {
    items: { name: string }[];
  };
  const ui = JSON.parse(read(uiDir, "package.json")) as {
    devDependencies: Record<string, string>;
  };

  it("lists exactly the items the registry has, plus the tokens item", () => {
    const section = page.slice(
      page.indexOf("## What is available"),
      page.indexOf("## How this is verified"),
    );
    const listed = [...section.matchAll(/^\| `([\w-]+)` \|/gm)].map((m) => m[1] as string);
    expect(listed.sort()).toEqual([...items.items.map((item) => item.name), "tokens"].sort());
  });

  it("uses the same namespace URL as the components page and the build output", () => {
    const url = '"@azmr": "https://platform.azmara.io/r/{name}.json"';
    expect(page).toContain(url);
    expect(read(siteDir, "content", "docs", "components", "index.mdx")).toContain(url);
  });

  it("names the shadcn CLI version the registry check pins", () => {
    expect(page).toContain(`(${ui.devDependencies.shadcn})`);
  });

  it("describes the files the button item copies", () => {
    const button = JSON.stringify(items.items.find((item) => item.name === "button"));
    for (const file of ["ui/button.tsx", "ui/button-variants.ts"]) expect(button).toContain(file);
    expect(button).toContain("@azmr/spinner");
    expect(button).toContain("@base-ui/react");
    expect(button).toContain("class-variance-authority");
    for (const text of [
      "button.tsx",
      "button-variants.ts",
      "spinner.tsx",
      "@base-ui/react",
      "class-variance-authority",
    ]) {
      expect(page, text).toContain(text);
    }
  });
});

describe("the getting-started sidebar", () => {
  it("puts the new pages where a reader meets them: why, then install, then theming and the registry", () => {
    const meta = JSON.parse(read(siteDir, "content", "docs", "guide", "meta.json")) as {
      pages: string[];
    };
    const at = (name: string) => meta.pages.indexOf(name);
    expect(at("why-azmr-ui")).toBeGreaterThan(at("introduction"));
    expect(at("why-azmr-ui")).toBeLessThan(at("installation"));
    expect(at("theming-quickstart")).toBeGreaterThan(at("server-components"));
    expect(at("shadcn-registry")).toBeGreaterThan(at("theming-quickstart"));
    expect(at("shadcn-registry")).toBeLessThan(at("---Concepts---"));
  });

  it("is reachable from the Introduction and the Installation pages", () => {
    const intro = guide("introduction");
    for (const page of ["why-azmr-ui", "installation", "theming-quickstart"]) {
      expect(intro, page).toContain(`(/docs/guide/${page})`);
    }
    const installation = guide("installation");
    expect(installation).toContain("(/docs/guide/shadcn-registry)");
    expect(installation).toContain("(/docs/guide/why-azmr-ui)");
  });
});

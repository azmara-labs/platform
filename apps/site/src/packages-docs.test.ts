import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SupabaseAdapter } from "@azmr/db-supabase";
import { describe, expect, it } from "vitest";
import { extractExamples, runExample } from "./lib/doc-examples";
import { PACKAGE_GROUPS, readPackages } from "./lib/package-index";

// The packages overview is generated from packages/*/package.json, and the db-supabase page makes
// claims about the package. These tests keep both honest.

const siteDir = join(import.meta.dirname, "..");
const packagesDir = join(siteDir, "..", "..", "packages");
const docsDir = join(siteDir, "content", "docs");
const read = (...path: string[]) => readFileSync(join(...path), "utf8");

const onDisk = readdirSync(packagesDir)
  .filter((entry) => statSync(join(packagesDir, entry)).isDirectory())
  .filter((entry) => readdirSync(join(packagesDir, entry)).includes("package.json"))
  .sort();

describe("readPackages", () => {
  const packages = readPackages(packagesDir);

  it("finds every package (guards against scanning nothing)", () => {
    expect(onDisk.length).toBeGreaterThanOrEqual(10);
    expect(packages.map((p) => p.slug).sort()).toEqual(onDisk);
  });

  it("reads the name, version and description from each package.json", () => {
    for (const pkg of packages) {
      const json = JSON.parse(read(packagesDir, pkg.slug, "package.json")) as {
        name: string;
        version: string;
        description: string;
        private?: boolean;
      };
      expect(pkg.name).toBe(json.name);
      expect(pkg.name).toBe(`@azmr/${pkg.slug}`);
      expect(pkg.version).toBe(json.version);
      expect(pkg.description).toBe(json.description);
      expect(json.private).toBeUndefined();
    }
  });

  it("lists the packages in the order of the groups", () => {
    expect(packages.map((p) => p.slug)).toEqual(PACKAGE_GROUPS.flatMap((g) => g.packages));
  });

  it("links each package to its docs page, changelog, npm page and source", () => {
    const core = packages.find((p) => p.slug === "core");
    expect(core).toMatchObject({
      docsUrl: "/docs/packages/core",
      changelogUrl: "/docs/changelog/core",
      npmUrl: "https://www.npmjs.com/package/@azmr/core",
      repoUrl: "https://github.com/azmara-labs/platform/tree/main/packages/core",
    });
  });

  describe("fails loudly when the groups and the folders disagree", () => {
    const make = (names: string[]) => {
      const dir = mkdtempSync(join(tmpdir(), "azmr-packages-"));
      for (const name of names) {
        mkdirSync(join(dir, name));
        writeFileSync(
          join(dir, name, "package.json"),
          JSON.stringify({ name: `@azmr/${name}`, version: "1.0.0" }),
        );
      }
      return dir;
    };
    const all = PACKAGE_GROUPS.flatMap((g) => g.packages);

    it("when a package is not in any group", () => {
      expect(() => readPackages(make([...all, "brand-new"]))).toThrow(/brand-new/);
    });

    it("when a group lists a package that does not exist", () => {
      expect(() => readPackages(make(all.filter((name) => name !== "cli")))).toThrow(/cli/);
    });
  });
});

describe("the docs for the packages", () => {
  it("has a page for every package, and the sidebar lists the overview and every page", () => {
    for (const slug of onDisk) {
      expect(() => read(docsDir, "packages", `${slug}.mdx`), slug).not.toThrow();
    }
    const meta = JSON.parse(read(docsDir, "packages", "meta.json")) as { pages: string[] };
    expect(meta.pages[0]).toBe("index");
    expect([...meta.pages.slice(1)].sort()).toEqual(onDisk);
  });

  it("lists every package in the introduction's table", () => {
    const intro = read(docsDir, "guide", "introduction.mdx");
    for (const slug of onDisk) expect(intro, slug).toContain(`\`@azmr/${slug}\``);
  });

  it("is right that core, security and db-core-interface depend on no other @azmr package", () => {
    for (const slug of ["core", "security", "db-core-interface"]) {
      const json = JSON.parse(read(packagesDir, slug, "package.json")) as {
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      const azmr = Object.keys({ ...json.dependencies, ...json.peerDependencies }).filter((n) =>
        n.startsWith("@azmr/"),
      );
      expect(azmr, slug).toEqual([]);
    }
  });
});

describe("the @azmr/db-supabase page", () => {
  const page = read(docsDir, "packages", "db-supabase.mdx");
  const examples = extractExamples(page);

  it("finds the examples (guards against scanning nothing)", () => {
    expect(examples.map((e) => e.name)).toEqual(["create-table", "error-fields"]);
  });

  it.each(examples.map((e) => [e.name, e] as const))(
    "%s: shows what the adapter does",
    async (_n, e) => {
      expect(e.expected, `${e.name} has no // => line`).not.toBeUndefined();
      // The client must never be reached by createTable, so a client that throws proves it.
      const client = {
        from() {
          throw new Error("the client was reached");
        },
      };
      expect(await runExample(e, { SupabaseAdapter, client })).toEqual(e.expected);
    },
  );

  it("lists exactly the filter operators of the DbAdapter contract", () => {
    const quoted = (text: string) => [...text.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    const documented = /type Filter = [\s\S]*?operator: ([^;]+);/.exec(page)?.[1] ?? "";
    const contract = read(packagesDir, "db-core-interface", "src", "adapter-interface.ts");
    const union = /export type FilterOperator =([^;]+);/.exec(contract)?.[1] ?? "";
    expect(quoted(documented).length).toBe(10);
    expect(quoted(documented)).toEqual(quoted(union));
  });

  it("states the dependencies and requirements the package really has", () => {
    const json = JSON.parse(read(packagesDir, "db-supabase", "package.json")) as {
      dependencies: Record<string, string>;
      peerDependencies: Record<string, string>;
      engines: { node: string };
    };
    expect(Object.keys(json.dependencies).sort()).toEqual([
      "@azmr/db-core-interface",
      "@azmr/security",
    ]);
    expect(json.peerDependencies["@supabase/supabase-js"]).toBe("^2.103.0");
    expect(page).toContain("^2.103.0");
    expect(json.engines.node).toBe(">=18.0.0");
    expect(page).toContain("Node.js 18 or later");
  });

  it("has no rawSelect, as the page says", () => {
    expect(typeof (SupabaseAdapter.prototype as unknown as Record<string, unknown>).rawSelect).toBe(
      "undefined",
    );
  });
});

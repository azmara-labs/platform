import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** One published package, as the packages overview shows it. Read from its package.json. */
export interface PackageInfo {
  /** The npm name, e.g. "@azmr/core". */
  name: string;
  /** The docs slug and directory name, e.g. "core". */
  slug: string;
  description: string;
  version: string;
  group: string;
  docsUrl: string;
  changelogUrl: string;
  npmUrl: string;
  repoUrl: string;
}

/**
 * How the packages are grouped on the overview, in display order. Every package under packages/
 * must be listed here exactly once, so a new package cannot be left off the overview: reading the
 * packages fails until it is added.
 */
export const PACKAGE_GROUPS: { title: string; packages: string[] }[] = [
  { title: "Reactivity and data", packages: ["core", "query"] },
  { title: "Database", packages: ["db", "db-core-interface", "db-supabase"] },
  { title: "User interface", packages: ["ui"] },
  { title: "Security", packages: ["security", "policycore"] },
  { title: "AI and tooling", packages: ["ai", "cli"] },
];

const REPO = "https://github.com/azmara-labs/platform/tree/main/packages";

export function readPackages(packagesDir: string): PackageInfo[] {
  const onDisk = readdirSync(packagesDir)
    .filter((entry) => statSync(join(packagesDir, entry)).isDirectory())
    .filter((entry) => existsSync(join(packagesDir, entry, "package.json")))
    .sort();
  const listed = PACKAGE_GROUPS.flatMap((g) => g.packages);

  const unlisted = onDisk.filter((slug) => !listed.includes(slug));
  if (unlisted.length > 0) {
    throw new Error(
      `packages missing from PACKAGE_GROUPS (src/lib/package-index.ts): ${unlisted.join(", ")}`,
    );
  }
  const missing = listed.filter((slug) => !onDisk.includes(slug));
  if (missing.length > 0) {
    throw new Error(`PACKAGE_GROUPS lists packages that do not exist: ${missing.join(", ")}`);
  }
  if (new Set(listed).size !== listed.length) {
    throw new Error("PACKAGE_GROUPS lists a package more than once");
  }

  return PACKAGE_GROUPS.flatMap((group) =>
    group.packages.map((slug) => {
      const pkg = JSON.parse(readFileSync(join(packagesDir, slug, "package.json"), "utf8")) as {
        name: string;
        version: string;
        description?: string;
      };
      return {
        name: pkg.name,
        slug,
        description: pkg.description ?? "",
        version: pkg.version,
        group: group.title,
        docsUrl: `/docs/packages/${slug}`,
        changelogUrl: `/docs/changelog/${slug}`,
        npmUrl: `https://www.npmjs.com/package/${pkg.name}`,
        repoUrl: `${REPO}/${slug}`,
      };
    }),
  );
}

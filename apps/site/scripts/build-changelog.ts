import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");
const OUTPUT_DIR = path.resolve(__dirname, "../content/docs/changelog");

export interface ChangelogVersionEntry {
  version: string;
  body: string;
}

/**
 * Parses a changesets-generated CHANGELOG.md into a list of {version, body}
 * entries. Deliberately does NOT parse the "### Minor Changes"/"### Patch
 * Changes" structure inside each version — that markdown is passed through
 * as-is and rendered directly, since restructuring it adds parsing risk for
 * no reader-facing benefit.
 *
 * Deliberately does NOT read the package name from the file's own "# " H1 —
 * older packages' CHANGELOG.md files still carry changesets' generic default
 * "# Changelog" heading rather than "# @azmr/xxx", so that heading isn't a
 * reliable source. The caller derives the package name from package.json.
 */
export function parseChangelog(content: string): ChangelogVersionEntry[] {
  const lines = content.split("\n");

  const entries: ChangelogVersionEntry[] = [];
  let currentVersion: string | null = null;
  let currentLines: string[] = [];

  function flush() {
    if (currentVersion !== null) {
      entries.push({ version: currentVersion, body: currentLines.join("\n").trim() });
    }
  }

  for (const line of lines) {
    const versionMatch = line.match(/^## (\S+)/);
    if (versionMatch) {
      flush();
      currentVersion = versionMatch[1] ?? null;
      currentLines = [];
    } else if (currentVersion !== null) {
      currentLines.push(line);
    }
  }
  flush();

  return entries;
}

function slugFromPackageName(packageName: string): string {
  return packageName.replace(/^@azmr\//, "");
}

function frontmatterEscape(value: string): string {
  return value.replace(/"/g, '\\"');
}

function generate(): void {
  if (!fs.existsSync(PACKAGES_DIR)) {
    throw new Error(`packages directory not found at ${PACKAGES_DIR}`);
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const packageDirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const slugs: string[] = [];

  for (const dir of packageDirs) {
    const changelogPath = path.join(PACKAGES_DIR, dir, "CHANGELOG.md");
    const packageJsonPath = path.join(PACKAGES_DIR, dir, "package.json");
    if (!fs.existsSync(changelogPath) || !fs.existsSync(packageJsonPath)) continue;

    const packageName = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")).name as string;
    const entries = parseChangelog(fs.readFileSync(changelogPath, "utf-8"));
    if (entries.length === 0) continue;

    const slug = slugFromPackageName(packageName);
    slugs.push(slug);

    const body = entries.map((e) => `## ${e.version}\n\n${e.body}`).join("\n\n");

    const mdx = `---
title: "${frontmatterEscape(packageName)}"
description: "Release history for ${frontmatterEscape(packageName)}."
---

${body}
`;

    fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.mdx`), mdx);
  }

  slugs.sort();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "meta.json"),
    `${JSON.stringify({ title: "Changelog", pages: slugs }, null, 2)}\n`,
  );

  console.log(`[build-changelog] generated ${slugs.length} changelog pages`);
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  generate();
}

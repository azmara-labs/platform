import { join, resolve, sep } from "node:path";

/**
 * A getting-started guide shows the files of a fixture that CI installs, builds and inspects
 * (packages/ui/fixtures/guides, see scripts/verify-guides.mjs). A guide names a file as
 * `<framework>/<path inside it>`, for example `next/app/page.tsx`. The name comes from MDX and is
 * turned into a file path, so it is checked before it is used: no `..`, no absolute paths, no
 * backslashes, and the result must be inside the fixtures folder.
 */
const SEGMENT = "[A-Za-z0-9_+@-][A-Za-z0-9_.+@-]*";
const FIXTURE_FILE = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+$`);

export function isFixtureFile(value: unknown): value is string {
  return typeof value === "string" && FIXTURE_FILE.test(value) && !value.split("/").includes("..");
}

/** Where the guides' fixtures are, from the docs site's folder (apps/site). */
export function fixturesRoot(siteDir: string): string {
  return resolve(siteDir, "..", "..", "packages", "ui", "fixtures", "guides");
}

/** The file for a fixture name, guaranteed to be inside `root`. */
export function fixtureFilePath(root: string, name: string): string {
  if (!isFixtureFile(name)) throw new Error(`Invalid fixture file: ${JSON.stringify(name)}`);
  const base = resolve(root);
  const file = resolve(join(base, ...name.split("/")));
  if (!file.startsWith(base + sep))
    throw new Error(`Invalid fixture file: ${JSON.stringify(name)}`);
  return file;
}

const LANGUAGES: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  mjs: "js",
  js: "js",
  css: "css",
  html: "html",
  json: "json",
};

/** The code-block language for a file name. */
export function languageOf(name: string): string {
  return LANGUAGES[name.split(".").at(-1) ?? ""] ?? "text";
}

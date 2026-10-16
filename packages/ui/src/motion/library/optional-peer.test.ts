import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = join(import.meta.dirname, "..", "..");
const pkg = JSON.parse(readFileSync(join(srcDir, "..", "package.json"), "utf8")) as {
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  dependencies?: Record<string, string>;
  exports: Record<string, unknown>;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const importsMotion = (text: string) =>
  /from\s+["']motion(\/[\w-]+)?["']|import\(\s*["']motion(\/[\w-]+)?["']\s*\)/.test(text);

describe("motion is an optional peer", () => {
  it("is declared as a peer dependency and marked optional", () => {
    expect(pkg.peerDependencies?.motion).toMatch(/\^?14/);
    expect(pkg.peerDependenciesMeta?.motion?.optional).toBe(true);
  });

  it("is not a regular dependency (installing @azmr/ui must not install it)", () => {
    expect(pkg.dependencies?.motion).toBeUndefined();
  });

  it("only the motion module's own source imports it, so nothing else needs it installed", () => {
    const offenders = walk(srcDir)
      .filter((f) => !/\.test\./.test(f))
      .filter((f) => importsMotion(readFileSync(f, "utf8")))
      .map((f) => relative(srcDir, f).replaceAll("\\", "/"))
      .filter((rel) => !rel.startsWith("motion/library/"));
    expect(offenders).toEqual([]);
  });

  it("the module exists and is exported as ./motion", () => {
    expect(pkg.exports["./motion"]).toEqual({
      types: "./dist/motion.d.ts",
      import: "./dist/motion.js",
    });
    expect(
      walk(join(srcDir, "motion", "library")).some((f) => importsMotion(readFileSync(f, "utf8"))),
    ).toBe(true);
  });
});

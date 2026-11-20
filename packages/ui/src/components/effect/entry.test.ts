import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..", "..");
const dist = join(root, "dist");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  exports: Record<string, unknown>;
};

describe("effect is an optional peer, used by one entry only", () => {
  it("is declared as an optional peer dependency, and the entry is exported", () => {
    expect(manifest.peerDependencies).toHaveProperty("effect");
    expect(manifest.peerDependenciesMeta?.effect?.optional).toBe(true);
    expect(manifest.exports).toHaveProperty("./effect");
  });

  // Needs a build: `pnpm -F @azmr/ui build` writes dist.
  const built = existsSync(dist);
  it.skipIf(!built)("is imported by effect.js and by no other built file", () => {
    const importers = readdirSync(dist)
      .filter((name) => name.endsWith(".js"))
      .filter((name) =>
        /from\s+["']effect(\/[^"']*)?["']/.test(readFileSync(join(dist, name), "utf8")),
      )
      .sort();
    expect(importers).toEqual(["effect.js"]);
  });

  it.skipIf(!built)("keeps zod, rhf and the root free of effect", () => {
    for (const name of ["zod.js", "rhf.js", "index.js"]) {
      expect(readFileSync(join(dist, name), "utf8"), name).not.toMatch(/["']effect["']/);
    }
  });
});

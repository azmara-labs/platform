import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Resolve with a plain path, not `new URL(...)`: under the jsdom test environment
// the global URL class is jsdom's, which `readFileSync` rejects.
const manifest = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports: Record<string, Record<string, string>>;
  sideEffects: boolean | string[];
};

describe("package manifest (packaging rules)", () => {
  it("declares @azmr/core as a peer, never a pinned dependency (two copies break Signal)", () => {
    expect(manifest.peerDependencies).toHaveProperty("@azmr/core");
    expect(manifest.dependencies ?? {}).not.toHaveProperty("@azmr/core");
  });

  it("keeps @azmr/core as a workspace devDependency so it can still be built and tested", () => {
    expect(manifest.devDependencies?.["@azmr/core"]).toMatch(/^workspace:/);
  });

  it("lists the types condition first in every export", () => {
    for (const [subpath, conditions] of Object.entries(manifest.exports)) {
      const keys = Object.keys(conditions);
      expect(keys[0], `exports["${subpath}"]`).toBe("types");
    }
  });

  it("exposes the client and server-safe subpaths", () => {
    expect(Object.keys(manifest.exports)).toEqual(
      expect.arrayContaining([".", "./hooks", "./lib"]),
    );
  });
});

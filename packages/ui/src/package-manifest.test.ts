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
  exports: Record<string, string | Record<string, string>>;
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

  it("lists the types condition first in every JavaScript export", () => {
    for (const [subpath, target] of Object.entries(manifest.exports)) {
      if (typeof target === "string") continue; // plain file exports, e.g. the stylesheet
      expect(Object.keys(target)[0], `exports["${subpath}"]`).toBe("types");
    }
  });

  it("exposes the client and server-safe subpaths and the stylesheet", () => {
    expect(Object.keys(manifest.exports)).toEqual(
      expect.arrayContaining([".", "./hooks", "./lib", "./styles.css"]),
    );
    expect(manifest.exports["./styles.css"]).toBe("./dist/styles.css");
    expect(manifest.exports["./tokens.css"]).toBe("./dist/tokens.css");
  });

  it("marks only CSS as side-effectful so JavaScript stays tree-shakeable", () => {
    expect(manifest.sideEffects).toEqual(["**/*.css"]);
  });
});

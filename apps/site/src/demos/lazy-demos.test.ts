import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { demos } from "./registry";

// lazy.tsx is generated from the registry (scripts/build-lazy-demos.mts). If they disagree, a page
// embedding a new demo would fail at runtime, so check them here.
const lazySource = readFileSync(join(import.meta.dirname, "lazy.tsx"), "utf8");

describe("lazy demo loaders", () => {
  it("has exactly the registry's demos (run `tsx scripts/build-lazy-demos.mts` after changing them)", () => {
    const lazyNames = [
      ...lazySource.matchAll(
        /^ {2}"([^"]+)": dynamic\(\(\) => import\("\.\/([^"]+)\.demo"\)\),$/gm,
      ),
    ];
    expect(lazyNames.map((m) => m[1]).sort()).toEqual(Object.keys(demos).sort());
    // Each loader imports the file its name points at.
    for (const [, name, path] of lazyNames) expect(path).toBe(name);
  });

  it("lists the same names in names.ts, which Demo checks on the server", async () => {
    const { demoNames } = await import("./names");
    expect([...demoNames].sort()).toEqual(Object.keys(demos).sort());
  });

  it("is a client module, so the dynamic imports split per demo", () => {
    expect(lazySource.startsWith('"use client";')).toBe(true);
  });
});

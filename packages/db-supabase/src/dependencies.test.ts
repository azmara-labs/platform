import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(dir, "..", "package.json"), "utf-8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

// @azmr/db depends on better-sqlite3, a native module. This package only needs the DbAdapter
// contract, which lives in @azmr/db-core-interface, so depending on @azmr/db here would make every
// Supabase-only app install SQLite for nothing.
describe("@azmr/db-supabase dependencies", () => {
  it("does not depend on @azmr/db or on any SQLite package", () => {
    const names = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
    expect(names).not.toContain("@azmr/db");
    expect(names.filter((n) => n.includes("sqlite"))).toEqual([]);
  });

  it("depends on the shared contract package", () => {
    expect(Object.keys(pkg.dependencies ?? {})).toContain("@azmr/db-core-interface");
  });

  it("never imports @azmr/db from its source", () => {
    const importsDb = /from "@azmr\/db(\/[^"]*)?"/;
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".ts") && name !== "dependencies.test.ts");
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const code = fs.readFileSync(path.join(dir, name), "utf-8");
      expect({ file: name, imports: importsDb.test(code) }).toEqual({ file: name, imports: false });
    }
  });
});

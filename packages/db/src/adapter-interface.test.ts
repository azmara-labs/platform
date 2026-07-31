import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Specifiers that would drag the native better-sqlite3 binding (and thus
// node-gyp) into the "@azmr/db/interface" subpath, which exists precisely so
// consumers like @azmr/db-supabase can depend on DbAdapter/DbAdapterError
// without installing a native module. Bundler-facing "sideEffects": false
// on this package is a secondary defence for the "." entry - this test
// guards the "./interface" entry directly.
const FORBIDDEN_SPECIFIERS = ["better-sqlite3", "./adapter.js"];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function findViolations(filePath: string, seen: Set<string>): string[] {
  if (seen.has(filePath)) return [];
  seen.add(filePath);

  const contents = fs.readFileSync(filePath, "utf-8");
  const code = stripComments(contents);
  const violations: string[] = [];

  for (const m of code.matchAll(/from "([^"]+)"/g) as IterableIterator<
    RegExpMatchArray & [string, string]
  >) {
    const [, specifier] = m;
    if (FORBIDDEN_SPECIFIERS.includes(specifier)) {
      violations.push(`${path.basename(filePath)}: imports "${specifier}"`);
    }
    if (specifier.startsWith("./")) {
      violations.push(
        ...findViolations(
          path.join(path.dirname(filePath), `${specifier.replace(/\.js$/, "")}.ts`),
          seen,
        ),
      );
    }
  }

  return violations;
}

describe("adapter-interface.ts source graph", () => {
  it("never pulls in better-sqlite3 or the SQLite adapter, transitively", () => {
    const violations = findViolations(path.join(dir, "adapter-interface.ts"), new Set());
    expect(violations).toEqual([]);
  });
});

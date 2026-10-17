import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DbAdapterError as CoreDbAdapterError } from "@azmr/db-core-interface";
import { describe, expect, it } from "vitest";
import { DbAdapterError as InterfaceDbAdapterError } from "./adapter-interface.js";
import { DbAdapterError as RootDbAdapterError } from "./index.js";

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

describe("DbAdapterError re-exports", () => {
  // DbAdapterError is a class, so `instanceof` only works if every entry point hands out the very
  // same one. A copy here would make `error instanceof DbAdapterError` false for errors thrown by
  // @azmr/db-supabase.
  it('hands out the class from @azmr/db-core-interface from both "@azmr/db" and "@azmr/db/interface"', () => {
    expect(InterfaceDbAdapterError).toBe(CoreDbAdapterError);
    expect(RootDbAdapterError).toBe(CoreDbAdapterError);
  });
});

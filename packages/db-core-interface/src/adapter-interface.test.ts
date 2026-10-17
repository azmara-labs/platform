import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DbAdapterError } from "./index.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("DbAdapterError", () => {
  it("is an Error named DbAdapterError that carries the message", () => {
    const error = new DbAdapterError("boom");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DbAdapterError);
    expect(error.name).toBe("DbAdapterError");
    expect(error.message).toBe("boom");
  });

  it("has no code, details, hint or cause unless given", () => {
    const error = new DbAdapterError("boom");
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error.hint).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it("keeps the code, details, hint and cause it is given", () => {
    const cause = new Error("underlying");
    const error = new DbAdapterError("boom", {
      code: "23505",
      details: "Key (id)=(1) already exists.",
      hint: "Use a different id.",
      cause,
    });
    expect(error.code).toBe("23505");
    expect(error.details).toBe("Key (id)=(1) already exists.");
    expect(error.hint).toBe("Use a different id.");
    expect(error.cause).toBe(cause);
  });
});

describe("package source", () => {
  // The point of this package is that the contract can be installed without anything else, in
  // particular without better-sqlite3 (a native module). A file that imports nothing cannot
  // pull anything in, directly or transitively, apart from its own sibling files.
  it("imports nothing outside this package", () => {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const code = fs
        .readFileSync(path.join(dir, name), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      const specifiers = [...code.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
      const outside = specifiers.filter((s) => !s?.startsWith("./"));
      expect({ file: name, outside }).toEqual({ file: name, outside: [] });
    }
  });

  it("declares no runtime dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "..", "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(pkg.peerDependencies ?? {}).toEqual({});
  });
});

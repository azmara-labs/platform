// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { effectSchemaResolver } from "./resolver.js";

describe("the Effect resolver on the server", () => {
  it("runs with no browser globals", async () => {
    expect(typeof window).toBe("undefined");
    const resolver = effectSchemaResolver(
      Schema.Struct({ name: Schema.NonEmptyString }) as never,
    ) as unknown as (...args: unknown[]) => Promise<{ errors: Record<string, unknown> }>;
    const result = await resolver({ name: "" }, undefined, { criteriaMode: "firstError" });
    expect(Object.keys(result.errors)).toEqual(["name"]);
  });

  it("imports nothing from react", () => {
    for (const file of ["resolver.ts", "index.ts"]) {
      const source = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["']react["']/);
    }
  });
});

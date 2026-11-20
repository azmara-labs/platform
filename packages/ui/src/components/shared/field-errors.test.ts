import { describe, expect, it } from "vitest";
import { sentenceCase } from "./field-def.js";
import { type FormIssue, issuesToFieldErrors } from "./field-errors.js";

const issue = (path: readonly PropertyKey[], message: string, code = "x"): FormIssue => ({
  path,
  code,
  message,
});

describe("issuesToFieldErrors", () => {
  it("keys an error by its field and keeps the type and message", () => {
    expect(issuesToFieldErrors([issue(["name"], "Enter a name")])).toEqual({
      name: { type: "x", message: "Enter a name" },
    });
  });

  it("nests a path, giving an array wherever the next segment is an index", () => {
    const errors = issuesToFieldErrors([
      issue(["tags", 0, "label"], "Enter a label"),
    ]) as unknown as {
      tags: { label: { message: string } }[];
    };
    expect(Array.isArray(errors.tags)).toBe(true);
    expect(errors.tags[0]?.label.message).toBe("Enter a label");
  });

  it("sends an issue on the whole form to root", () => {
    expect(issuesToFieldErrors([issue([], "The form is wrong")])).toEqual({
      root: { type: "x", message: "The form is wrong" },
    });
  });

  it("keeps the first error of a field under firstError", () => {
    const errors = issuesToFieldErrors([
      issue(["a"], "first"),
      issue(["a"], "second", "y"),
    ]) as unknown as {
      a: { message: string; types?: unknown };
    };
    expect(errors.a.message).toBe("first");
    expect(errors.a.types).toBeUndefined();
  });

  it("collects every message by type under all, as an array when a type repeats", () => {
    const errors = issuesToFieldErrors(
      [issue(["a"], "one"), issue(["a"], "two"), issue(["a"], "three", "y")],
      "all",
    ) as unknown as { a: { types: Record<string, string | string[]> } };
    expect(errors.a.types).toEqual({ x: ["one", "two"], y: "three" });
  });

  it("stringifies a numeric or symbol segment without throwing", () => {
    const key = Symbol.for("k");
    expect(() => issuesToFieldErrors([issue([key], "m"), issue([3], "n")])).not.toThrow();
    const errors = issuesToFieldErrors([issue([3], "n")]) as Record<string, unknown>;
    expect(errors["3"]).toEqual({ type: "x", message: "n" });
  });

  it("does not throw when a path runs through a field that already has an error", () => {
    expect(() =>
      issuesToFieldErrors([issue(["a"], "leaf"), issue(["a", "b"], "deeper")]),
    ).not.toThrow();
  });
});

describe("sentenceCase", () => {
  it.each([
    ["invoiceEmail", "Invoice email"],
    ["first_name", "First name"],
    ["name", "Name"],
    ["billing-address", "Billing address"],
  ])("turns %s into %s", (key, expected) => {
    expect(sentenceCase(key)).toBe(expected);
  });
});

describe("server safety", () => {
  it("imports nothing from react", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const file of ["field-errors.ts", "field-def.ts"]) {
      const source = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["']react["']/);
    }
  });
});

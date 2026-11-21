import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { parseFormData } from "./index.js";

const schema = Schema.Struct({
  name: Schema.NonEmptyString,
  terms: Schema.Literal(true),
  plan: Schema.Literals(["free", "pro"]),
  tags: Schema.Array(Schema.Literals(["a", "b", "c"])),
});

const post = (entries: [string, string][]) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

const valid: [string, string][] = [
  ["name", "Aroha"],
  ["terms", "on"],
  ["plan", "pro"],
  ["tags", "a"],
];

describe("parseFormData (Effect)", () => {
  it("accepts a valid post and returns the decoded data", async () => {
    const result = await parseFormData(schema, post(valid));
    expect(result).toEqual({
      success: true,
      data: { name: "Aroha", terms: true, plan: "pro", tags: ["a"] },
    });
  });

  it("rejects an enum value outside the set, with the error on that field", async () => {
    const result = await parseFormData(
      schema,
      post(valid.map(([k, v]) => [k, k === "plan" ? "x" : v])),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.errors)).toEqual(["plan"]);
  });

  it("rejects an array member outside the set", async () => {
    const result = await parseFormData(schema, post([...valid, ["tags", "zzz"]]));
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.errors)).toEqual(["tags"]);
  });

  it("rejects terms=false and a missing checkbox", async () => {
    const wrong = await parseFormData(
      schema,
      post(valid.map(([k, v]) => [k, k === "terms" ? "false" : v])),
    );
    expect(wrong.success).toBe(false);
    const missing = await parseFormData(schema, post(valid.filter(([k]) => k !== "terms")));
    expect(missing.success).toBe(false);
  });

  it("rejects duplicate keys on a single-value field", async () => {
    const result = await parseFormData(schema, post([...valid, ["plan", "free"]]));
    expect(result.success).toBe(false);
  });
});

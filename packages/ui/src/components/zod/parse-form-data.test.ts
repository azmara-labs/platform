import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFormData } from "./index.js";

const schema = z.object({
  name: z.string().min(1, "Enter your name"),
  terms: z.literal(true, "You must accept the terms"),
  notify: z.boolean(),
  plan: z.enum(["free", "pro"], "Pick a plan"),
  tags: z.array(z.enum(["a", "b", "c"])).min(1, "Pick at least one tag"),
});

const post = (entries: [string, string | File][]) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

const valid: [string, string][] = [
  ["name", "Aroha"],
  ["terms", "on"],
  ["plan", "pro"],
  ["tags", "a"],
  ["tags", "c"],
];

const fail = async (entries: [string, string | File][]) => {
  const result = await parseFormData(schema, post(entries));
  if (result.success) throw new Error("expected the post to be rejected");
  return result.errors as Record<string, unknown>;
};

describe("parseFormData (zod)", () => {
  it("accepts a valid post and returns the parsed data, with typed values", async () => {
    const result = await parseFormData(schema, post(valid));
    expect(result).toEqual({
      success: true,
      data: { name: "Aroha", terms: true, notify: false, plan: "pro", tags: ["a", "c"] },
    });
  });

  it("rejects an enum value outside the set, with the error on that field", async () => {
    const errors = await fail(valid.map(([k, v]) => [k, k === "plan" ? "enterprise" : v]));
    expect(Object.keys(errors)).toEqual(["plan"]);
  });

  it("rejects an array member outside the set", async () => {
    const errors = await fail([...valid, ["tags", "zzz"]]);
    expect(errors.tags).toBeDefined();
  });

  it("rejects terms=false for z.literal(true)", async () => {
    const errors = await fail(valid.map(([k, v]) => [k, k === "terms" ? "false" : v]));
    expect(Object.keys(errors)).toEqual(["terms"]);
  });

  it("rejects a missing required checkbox", async () => {
    const errors = await fail(valid.filter(([k]) => k !== "terms"));
    expect(Object.keys(errors)).toEqual(["terms"]);
  });

  it("rejects a posted 'false' for a plain boolean: it never becomes false or true", async () => {
    const errors = await fail([...valid, ["notify", "false"]]);
    expect(Object.keys(errors)).toEqual(["notify"]);
  });

  it("accepts a plain boolean that is ticked or left out", async () => {
    const ticked = await parseFormData(schema, post([...valid, ["notify", "on"]]));
    expect(ticked.success && ticked.data.notify).toBe(true);
    const left = await parseFormData(schema, post(valid));
    expect(left.success && left.data.notify).toBe(false);
  });

  it("rejects duplicate keys on a single-value enum field, never taking the first", async () => {
    const errors = await fail([...valid, ["plan", "free"]]);
    expect(Object.keys(errors)).toEqual(["plan"]);
  });

  it("rejects a required array left empty", async () => {
    const errors = await fail(valid.filter(([k]) => k !== "tags"));
    expect(Object.keys(errors)).toEqual(["tags"]);
  });

  it("ignores unknown keys and a __proto__ key", async () => {
    const result = await parseFormData(
      schema,
      post([...valid, ["__proto__", "x"], ["isAdmin", "true"], ["constructor", "y"]]),
    );
    expect(result.success).toBe(true);
    if (result.success)
      expect(Object.keys(result.data).sort()).toEqual(["name", "notify", "plan", "tags", "terms"]);
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  it("rejects a file where a string is expected", async () => {
    const errors = await fail(
      valid.map(([k, v]) => [k, k === "name" ? new File(["x"], "x.txt") : v]),
    );
    expect(Object.keys(errors)).toEqual(["name"]);
  });
});

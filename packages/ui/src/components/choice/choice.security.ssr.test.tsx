// @vitest-environment node
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { parseFormData as parseEffect } from "../effect/index.js";
import { parseFormData as parseZod } from "../zod/index.js";
import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "./index.js";

const PAYLOADS = [
  '"><img src=x onerror=alert(1)>',
  "<script>alert(1)</script>",
  "</script><script>alert(1)</script>",
  "__proto__",
  "constructor",
  "javascript:alert(1)",
  "x".repeat(10_000),
  "a‮b",
  "",
] as const;

/** What React turns text into, so the test can look for the escaped form. */
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

/**
 * The names of every attribute on every real tag in `html`. React always quotes attribute values
 * and escapes quotes and angle brackets inside them, so a tag and its attributes can be read with
 * simple patterns, and escaped payload text inside a value is not mistaken for an attribute.
 */
function attributeNames(html: string): string[] {
  const names: string[] = [];
  for (const tag of html.matchAll(/<[a-z][a-z0-9-]*((?:\s+[^\s=>"']+(?:="[^"]*")?)*)\s*\/?>/gi)) {
    for (const attr of (tag[1] ?? "").matchAll(/\s+([^\s=>"']+)(?:="[^"]*")?/g)) {
      names.push((attr[1] ?? "").toLowerCase());
    }
  }
  return names;
}

const protoKeys = () => Object.getOwnPropertyNames(Object.prototype).sort();

describe.each(PAYLOADS)("server-rendered hostile input %j", (payload) => {
  it("is escaped text, never markup", () => {
    const options = [{ value: payload, label: payload, description: payload }];
    const html = expectServerSafe(
      <div>
        <Checkbox label={payload} description={payload} error={payload} name="a" />
        <Switch label={payload} description={payload} error={payload} name="b" />
        <RadioGroup
          label={payload}
          description={payload}
          error={payload}
          options={options}
          name="c"
        />
        <CheckboxGroup
          label={payload}
          description={payload}
          error={payload}
          options={options}
          selectAllLabel={payload}
          name="d"
        />
      </div>,
    );
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<script/i);
    // Handlers are attributes of real tags; the payload's own text may read " onerror=" once escaped.
    expect(attributeNames(html).filter((n) => n.startsWith("on"))).toEqual([]);
    expect(attributeNames(html)).toContain("aria-hidden");
    if (payload) expect(html).toContain(escapeHtml(payload));
  });
});

describe.each(PAYLOADS)("posted hostile input %j", (payload) => {
  const zodSchema = z.object({
    plan: z.enum(["free", "pro"]),
    tags: z.array(z.enum(["a", "b"])),
    terms: z.boolean(),
  });
  const effectSchema = Schema.Struct({
    plan: Schema.Literals(["free", "pro"]),
    tags: Schema.Array(Schema.Literals(["a", "b"])),
    terms: Schema.Boolean,
  });
  const good = (): FormData => {
    const data = new FormData();
    data.append("plan", "pro");
    data.append("tags", "a");
    return data;
  };

  it("as an enum value is rejected on that field", async () => {
    const data = good();
    data.set("plan", payload);
    for (const result of [await parseZod(zodSchema, data), await parseEffect(effectSchema, data)]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(result.errors)).toEqual(["plan"]);
    }
  });

  it("as an array member is rejected on that field", async () => {
    const data = good();
    data.append("tags", payload);
    for (const result of [await parseZod(zodSchema, data), await parseEffect(effectSchema, data)]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(result.errors)).toEqual(["tags"]);
    }
  });

  it("as a field name adds nothing: only the schema's keys come back", async () => {
    const before = protoKeys();
    const data = good();
    data.append(payload, "x");
    for (const result of [await parseZod(zodSchema, data), await parseEffect(effectSchema, data)]) {
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data).sort()).toEqual(["plan", "tags", "terms"]);
        expect(Object.getPrototypeOf(result.data)).toBe(Object.prototype);
      }
    }
    expect(protoKeys()).toEqual(before);
  });

  it("as the posted value of a checkbox is rejected, never read as true or false", async () => {
    if (payload === "") return;
    const data = good();
    data.set("terms", payload);
    for (const result of [await parseZod(zodSchema, data), await parseEffect(effectSchema, data)]) {
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(result.errors)).toEqual(["terms"]);
    }
  });
});

import { Effect, Schema, SchemaGetter } from "effect";
import { describe, expect, it } from "vitest";
import { effectSchemaResolver, toFormIssues } from "./resolver.js";

type Run = (
  schema: unknown,
  values: unknown,
  criteriaMode?: "firstError" | "all",
  // biome-ignore lint/suspicious/noExplicitAny: the tests read loosely typed error objects
) => Promise<{ values: unknown; errors: Record<string, any> }>;

/** Call the resolver the way React Hook Form does. */
const run: Run = (schema, values, criteriaMode = "firstError") =>
  (effectSchemaResolver(schema as never) as unknown as (...args: unknown[]) => ReturnType<Run>)(
    values,
    undefined,
    { criteriaMode, fields: {}, shouldUseNativeValidation: false },
  );

const Customer = Schema.Struct({
  name: Schema.NonEmptyString,
  invoiceEmail: Schema.optional(
    Schema.String.pipe(Schema.check(Schema.isPattern(/^[^@\s]+@[^@\s]+$/))),
  ),
  age: Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 18, maximum: 99 }))),
  tags: Schema.Array(Schema.Struct({ label: Schema.NonEmptyString })),
});

describe("effectSchemaResolver: success", () => {
  it("returns the decoded value and no errors", async () => {
    const result = await run(Customer, { name: "Aroha", age: 30, tags: [{ label: "vip" }] });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: "Aroha", age: 30, tags: [{ label: "vip" }] });
  });

  it("applies a transform, so the decoded number reaches onSubmit", async () => {
    const result = await run(Schema.Struct({ n: Schema.NumberFromString }), { n: "42" });
    expect(result.values).toEqual({ n: 42 });
  });
});

describe("effectSchemaResolver: errors", () => {
  it("reports every error, not the first, with nested and array paths", async () => {
    const result = await run(Customer, {
      name: "",
      invoiceEmail: "nope",
      age: 5,
      tags: [{ label: "" }, { label: "ok" }, { label: "" }],
    });
    expect(result.values).toEqual({});
    expect(Object.keys(result.errors).sort()).toEqual(["age", "invoiceEmail", "name", "tags"]);
    expect(Array.isArray(result.errors.tags)).toBe(true);
    expect(result.errors.tags[0].label.message).toContain("at least 1");
    expect(result.errors.tags[1]).toBeUndefined();
    expect(result.errors.tags[2].label.message).toContain("at least 1");
  });

  it("uses Effect's own message by default, and a message on the failing check replaces it", async () => {
    const Plain = Schema.Struct({ x: Schema.String.pipe(Schema.check(Schema.isMinLength(3))) });
    const Custom = Schema.Struct({
      x: Schema.String.pipe(Schema.check(Schema.isMinLength(3, { message: "Too short" }))),
    });
    expect((await run(Plain, { x: "a" })).errors.x.message).toContain("at least 3");
    expect((await run(Custom, { x: "a" })).errors.x.message).toBe("Too short");
  });

  it("puts a struct-level failure on the field it names, or on root when it names none", async () => {
    const Pair = Schema.Struct({ a: Schema.String, b: Schema.String });
    const OnField = Pair.check(
      Schema.makeFilter((v) =>
        v.a === v.b ? undefined : { path: ["b"], issue: "b must equal a" },
      ),
    );
    const Whole = Pair.check(
      Schema.makeFilter((v) => (v.a === v.b ? undefined : "The pair must match")),
    );
    expect((await run(OnField, { a: "1", b: "2" })).errors.b.message).toBe("b must equal a");
    expect((await run(Whole, { a: "1", b: "2" })).errors.root.message).toBe("The pair must match");
  });

  it("reaches the errors object even for a path that is not a field", async () => {
    const Odd = Schema.Struct({ a: Schema.String }).check(
      Schema.makeFilter(() => ({ path: ["nope"], issue: "No such field" })),
    );
    const result = await run(Odd, { a: "x" });
    expect(result.errors.nope.message).toBe("No such field");
  });

  it("awaits an effectful check, such as a uniqueness test against a server", async () => {
    const Slug = Schema.String.pipe(
      Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.checkEffect((s: string) =>
          Effect.promise(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return s === "taken" ? "That web address is taken" : undefined;
          }),
        ),
        encode: SchemaGetter.passthrough(),
      }),
    );
    const Form = Schema.Struct({ slug: Slug });
    expect((await run(Form, { slug: "mine" })).errors).toEqual({});
    expect((await run(Form, { slug: "taken" })).errors.slug.message).toBe(
      "That web address is taken",
    );
  });

  it("collects every message of a field under criteriaMode all", async () => {
    const Code = Schema.Struct({
      code: Schema.String.pipe(Schema.check(Schema.isMinLength(5), Schema.isPattern(/^\d+$/))),
    });
    const first = await run(Code, { code: "ab" });
    expect(first.errors.code.types).toBeUndefined();
    const all = await run(Code, { code: "ab" }, "all");
    expect(all.errors.code.types.validate).toHaveLength(2);
  });

  it("reports an empty string for a plain number as an error on that field, not a crash", async () => {
    const result = await run(Schema.Struct({ n: Schema.Number }), { n: "" });
    expect(result.errors.n.message).toEqual(expect.any(String));
    expect(result.errors.n.message.length).toBeGreaterThan(0);
  });

  it("needs NonEmptyString before and isFinite after NumberFromString, which on its own turns a blank into 0 and text into NaN", async () => {
    // NumberFromString alone is not safe for a text input: "" and " " decode to 0, "abc" to NaN.
    const Loose = Schema.Struct({ n: Schema.NumberFromString });
    expect((await run(Loose, { n: "" })).errors).toEqual({});
    expect((await run(Loose, { n: "" })).values).toEqual({ n: 0 });

    const Safe = Schema.Struct({
      n: Schema.NonEmptyString.pipe(
        Schema.decodeTo(Schema.NumberFromString.pipe(Schema.check(Schema.isFinite()))),
      ),
    });
    expect((await run(Safe, { n: "" })).errors.n).toBeDefined();
    expect((await run(Safe, { n: "abc" })).errors.n).toBeDefined();
    expect((await run(Safe, { n: "42" })).values).toEqual({ n: 42 });
  });

  it("types every error as validate, since Effect issues carry no code", async () => {
    const result = await run(Customer, { name: "", age: 30, tags: [] });
    expect(result.errors.name.type).toBe("validate");
  });
});

describe("effectSchemaResolver: an unexpected exception", () => {
  it("rejects with the original error instead of showing its stack trace as a field message", async () => {
    const Boom = Schema.Struct({ a: Schema.String }).check(
      Schema.makeFilter(() => {
        throw new Error("boom in refinement");
      }),
    );
    await expect(run(Boom, { a: "x" })).rejects.toThrow("boom in refinement");
    await expect(run(Boom, { a: "x" })).rejects.toBeInstanceOf(Error);
  });
});

describe("toFormIssues", () => {
  it("reads plain, numeric and { key } path segments, and a missing path as the whole form", () => {
    const symbol = Symbol.for("k");
    expect(
      toFormIssues([
        { message: "a", path: [{ key: "x" }, 0, "y"] },
        { message: "b", path: [symbol] },
        { message: "c" },
      ]),
    ).toEqual([
      { path: ["x", 0, "y"], code: "validate", message: "a" },
      { path: [symbol], code: "validate", message: "b" },
      { path: [], code: "validate", message: "c" },
    ]);
  });
});

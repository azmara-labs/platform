import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldsFromSchema as zodFields } from "../zod/index.js";
import { fieldFromSchema, fieldsFromSchema } from "./fields.js";

describe("fieldFromSchema", () => {
  const cases: [string, string, Schema.Top, Record<string, unknown>][] = [
    [
      "a non-empty string",
      "name",
      Schema.NonEmptyString,
      { label: "Name", type: "text", required: true, min: 1 },
    ],
    [
      "a string with a maximum length",
      "code",
      Schema.String.pipe(Schema.check(Schema.isMaxLength(5))),
      { label: "Code", type: "text", required: true, max: 5 },
    ],
    [
      "a number between two limits",
      "age",
      Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 18, maximum: 99 }))),
      { label: "Age", type: "number", required: true, min: 18, max: 99 },
    ],
    [
      "a number with separate minimum and maximum checks",
      "qty",
      Schema.Number.pipe(
        Schema.check(Schema.isGreaterThanOrEqualTo(3)),
        Schema.check(Schema.isLessThanOrEqualTo(9)),
      ),
      { label: "Qty", type: "number", required: true, min: 3, max: 9 },
    ],
    [
      "an exclusive bound, which is never reported as a minimum",
      "score",
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(3))),
      { label: "Score", type: "number", required: true },
    ],
    ["a boolean", "agree", Schema.Boolean, { label: "Agree", type: "boolean", required: true }],
    [
      "an array of literals, as a multiselect",
      "tags",
      Schema.Array(Schema.Literals(["a", "b"])),
      { label: "Tags", type: "multiselect", required: true, options: ["a", "b"] },
    ],
    [
      "an optional array of literals",
      "extras",
      Schema.optional(Schema.Array(Schema.Literals(["x", "y"]))),
      { label: "Extras", type: "multiselect", required: false, options: ["x", "y"] },
    ],
    [
      "an array of strings, which is not a choice",
      "notes",
      Schema.Array(Schema.String),
      { label: "Notes", type: "custom", required: true },
    ],
    [
      "literals, as the choices of an enum (numbers as strings)",
      "role",
      Schema.Literals(["admin", "user"]),
      { label: "Role", type: "enum", required: true, options: ["admin", "user"] },
    ],
    [
      "a number from a string, by its decoded type",
      "budget",
      Schema.NumberFromString,
      { label: "Budget", type: "number", required: true },
    ],
    [
      "an optional field",
      "nick",
      Schema.optional(Schema.String),
      { label: "Nick", type: "text", required: false },
    ],
    [
      "an optional number, with its limits read from inside",
      "tries",
      Schema.optional(
        Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 5 }))),
      ),
      { label: "Tries", type: "number", required: false, min: 1, max: 5 },
    ],
    [
      "an optional key",
      "alias",
      Schema.optionalKey(Schema.String),
      { label: "Alias", type: "text", required: false },
    ],
    [
      "a nullable field",
      "middle",
      Schema.NullOr(Schema.String),
      { label: "Middle", type: "text", required: false },
    ],
    [
      "a nullish field",
      "other",
      Schema.NullishOr(Schema.String),
      { label: "Other", type: "text", required: false },
    ],
    [
      "the title annotation as the label",
      "invoiceEmail",
      Schema.String.annotate({ title: "Billing email" }),
      { label: "Billing email", type: "text", required: true },
    ],
    [
      "a fieldType annotation, which overrides the type",
      "total",
      Schema.Number.annotate({ fieldType: "money" }),
      { label: "Total", type: "money", required: true },
    ],
    [
      "a meta annotation, copied to meta",
      "notes",
      Schema.String.annotate({ meta: { rows: 4 } }),
      { label: "Notes", type: "text", required: true, meta: { rows: 4 } },
    ],
    [
      "title, fieldType and meta given after a check (Effect puts them on the check)",
      "creditLimit",
      Schema.Number.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))).annotate({
        title: "Credit limit",
        fieldType: "money",
        meta: { currency: "NZD" },
      }),
      { label: "Credit limit", type: "money", required: true, min: 0, meta: { currency: "NZD" } },
    ],
    [
      "a title given after a check inside an optional",
      "tries",
      Schema.optional(
        Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 5 }))).annotate({
          title: "Attempts",
        }),
      ),
      { label: "Attempts", type: "number", required: false, min: 1, max: 5 },
    ],
    [
      "an exclusive isBetween, which sets no limit",
      "score",
      Schema.Number.pipe(
        Schema.check(
          Schema.isBetween({
            minimum: 0,
            maximum: 10,
            exclusiveMinimum: true,
            exclusiveMaximum: true,
          }),
        ),
      ),
      { label: "Score", type: "number", required: true },
    ],
    [
      "an isBetween exclusive on one side only, keeping the inclusive bound",
      "ratio",
      Schema.Number.pipe(
        Schema.check(Schema.isBetween({ minimum: 0, maximum: 10, exclusiveMinimum: true })),
      ),
      { label: "Ratio", type: "number", required: true, max: 10 },
    ],
    ["a Date", "born", Schema.Date, { label: "Born", type: "date", required: true }],
    ["a DateTimeUtc", "seen", Schema.DateTimeUtc, { label: "Seen", type: "date", required: true }],
    [
      "a key in camel case",
      "invoiceEmail",
      Schema.String,
      { label: "Invoice email", type: "text", required: true },
    ],
  ];

  it.each(cases)("describes %s", (_what, name, schema, expected) => {
    expect(fieldFromSchema(name, schema)).toEqual({ name, ...expected });
  });

  it.each([
    ["an array", Schema.Array(Schema.String)],
    ["an unknown value", Schema.Unknown],
    ["a nested struct", Schema.Struct({ a: Schema.String })],
    ["a single literal", Schema.Literal("only")],
  ])("calls %s a custom field and never throws", (_what, schema) => {
    const field = fieldFromSchema("x", schema as Schema.Top);
    expect(field.type).toBe("custom");
    expect(field.required).toBe(true);
  });
});

describe("the example in the forms guide", () => {
  it("produces exactly the output the guide shows", () => {
    expect(
      fieldsFromSchema(
        Schema.Struct({
          fullName: Schema.NonEmptyString.annotate({ title: "Full name" }),
          creditLimit: Schema.Number.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))).annotate({
            fieldType: "money",
          }),
          tier: Schema.Literals(["bronze", "silver", "gold"]),
          notes: Schema.optional(Schema.String),
        }),
      ),
    ).toEqual([
      { name: "fullName", label: "Full name", type: "text", required: true, min: 1 },
      { name: "creditLimit", label: "Credit limit", type: "money", required: true, min: 0 },
      {
        name: "tier",
        label: "Tier",
        type: "enum",
        required: true,
        options: ["bronze", "silver", "gold"],
      },
      { name: "notes", label: "Notes", type: "text", required: false },
    ]);
  });
});

describe("fieldsFromSchema", () => {
  it("reads a title that differs from the key's sentence case, even after a check", () => {
    const [field] = fieldsFromSchema(
      Schema.Struct({ fn: Schema.NonEmptyString.annotate({ title: "Given name" }) }),
    );
    expect(field?.label).toBe("Given name");
  });

  it("lists every field in order", () => {
    const fields = fieldsFromSchema(
      Schema.Struct({ b: Schema.String, a: Schema.Number, c: Schema.Boolean }),
    );
    expect(fields.map((f) => f.name)).toEqual(["b", "a", "c"]);
  });

  it("describes a form exactly as the Zod adapter describes the equivalent schema", () => {
    const fromEffect = fieldsFromSchema(
      Schema.Struct({
        name: Schema.NonEmptyString,
        age: Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 18, maximum: 99 }))),
        nick: Schema.optional(Schema.String),
        role: Schema.Literals(["admin", "user"]),
        agree: Schema.Boolean,
        code: Schema.String.pipe(Schema.check(Schema.isMaxLength(5))),
        born: Schema.Date,
        tags: Schema.Array(Schema.Literals(["a", "b"])),
      }),
    );
    const fromZod = zodFields(
      z.object({
        name: z.string().min(1),
        age: z.number().min(18).max(99),
        nick: z.string().optional(),
        role: z.enum(["admin", "user"]),
        agree: z.boolean(),
        code: z.string().max(5),
        born: z.date(),
        tags: z.array(z.enum(["a", "b"])),
      }),
    );
    expect(fromEffect).toEqual(fromZod);
  });
});

describe("the Effect markers this adapter reads", () => {
  it.each([
    ["Schema.Date", Schema.Date, "effect/schema/Date"],
    ["Schema.DateTimeUtc", Schema.DateTimeUtc, "effect/schema/DateTimeUtc"],
  ])("%s carries its representation id", (_name, schema, id) => {
    const annotations = schema.ast.annotations as { representation?: { id?: string } };
    expect(annotations.representation?.id).toBe(id);
  });

  it("an exclusive isBetween keeps its flags in the payload", () => {
    const check = Schema.Number.pipe(
      Schema.check(Schema.isBetween({ minimum: 0, maximum: 1, exclusiveMinimum: true })),
    ).ast.checks?.[0]?.annotations as { representation?: { payload?: Record<string, unknown> } };
    expect(check.representation?.payload?.exclusiveMinimum).toBe(true);
  });
});

describe("the Effect check ids this adapter reads", () => {
  // If Effect renames one, these fail loudly instead of the limits quietly disappearing.
  it.each([
    [
      "isMinLength",
      Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
      "effect/schema/isMinLength",
    ],
    [
      "isMaxLength",
      Schema.String.pipe(Schema.check(Schema.isMaxLength(2))),
      "effect/schema/isMaxLength",
    ],
    [
      "isBetween",
      Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 2 }))),
      "effect/schema/isBetween",
    ],
    [
      "isGreaterThanOrEqualTo",
      Schema.Number.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
      "effect/schema/isGreaterThanOrEqualTo",
    ],
    [
      "isLessThanOrEqualTo",
      Schema.Number.pipe(Schema.check(Schema.isLessThanOrEqualTo(1))),
      "effect/schema/isLessThanOrEqualTo",
    ],
  ])("%s", (_name, schema, id) => {
    const representation = (
      schema.ast.checks?.[0]?.annotations as { representation?: { id?: string } } | undefined
    )?.representation;
    expect(representation?.id).toBe(id);
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldFromSchema, fieldsFromSchema, toFieldErrors, zodResolver } from "./index.js";

const resolverOptions = { fields: {}, shouldUseNativeValidation: false } as const;

// The errors object, walkable without casts at every level.
type ErrorTree = { [key: string]: ErrorTree } & { message?: string; type?: string };

describe("zodResolver", () => {
  const schema = z.object({
    email: z.email("Enter an email address"),
    age: z.number("Enter your age").int().min(18, "You must be 18 or over"),
    address: z.object({ city: z.string().min(1, "Enter a town or city") }),
    lines: z.array(z.object({ amount: z.number().positive("Enter an amount above 0") })),
  });

  it("returns the parsed values and no errors when valid", async () => {
    const result = await zodResolver(schema)(
      { email: "kia@ora.nz", age: 30, address: { city: "Hamilton" }, lines: [{ amount: 5 }] },
      undefined,
      resolverOptions,
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({
      email: "kia@ora.nz",
      age: 30,
      address: { city: "Hamilton" },
      lines: [{ amount: 5 }],
    });
  });

  it("puts each issue on its field path, nested objects and arrays included", async () => {
    const result = await zodResolver(schema)(
      { email: "nope", age: 16, address: { city: "" }, lines: [{ amount: 5 }, { amount: 0 }] },
      undefined,
      resolverOptions,
    );
    expect(result.values).toEqual({});
    const errors = result.errors as ErrorTree;
    expect(errors.email).toMatchObject({ message: "Enter an email address" });
    expect(errors.age).toMatchObject({ type: "too_small", message: "You must be 18 or over" });
    expect(errors.address?.city).toMatchObject({ message: "Enter a town or city" });
    expect(Array.isArray(errors.lines)).toBe(true);
    expect(errors.lines?.[0]).toBeUndefined();
    expect(errors.lines?.[1]?.amount).toMatchObject({ message: "Enter an amount above 0" });
  });

  it("applies transforms and defaults to the submitted values", async () => {
    const withTransforms = z.object({
      name: z.string().trim(),
      plan: z.enum(["starter", "growth"]).default("starter"),
    });
    const result = await zodResolver(withTransforms)(
      { name: "  Aroha  " },
      undefined,
      resolverOptions,
    );
    expect(result.values).toEqual({ name: "Aroha", plan: "starter" });
  });

  it("runs async refinements", async () => {
    const taken = new Set(["northline"]);
    const signup = z.object({
      slug: z.string().refine(
        async (slug) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return !taken.has(slug);
        },
        { message: "That address is taken" },
      ),
    });
    const bad = await zodResolver(signup)({ slug: "northline" }, undefined, resolverOptions);
    expect((bad.errors as ErrorTree).slug?.message).toBe("That address is taken");
    const good = await zodResolver(signup)({ slug: "southline" }, undefined, resolverOptions);
    expect(good.errors).toEqual({});
  });

  it("sends object-level issues to root", async () => {
    const passwords = z
      .object({ password: z.string(), confirm: z.string() })
      .refine((value) => value.password === value.confirm, {
        message: "The passwords don't match",
      });
    const result = await zodResolver(passwords)(
      { password: "a", confirm: "b" },
      undefined,
      resolverOptions,
    );
    expect((result.errors as ErrorTree).root?.message).toBe("The passwords don't match");
  });
});

describe("toFieldErrors", () => {
  it("keeps the first message per field, or every one with criteriaMode all", () => {
    const issues = [
      {
        code: "too_small",
        path: ["code"],
        message: "Too short",
        input: "",
        origin: "string",
        minimum: 4,
        inclusive: true,
      },
      {
        code: "invalid_format",
        path: ["code"],
        message: "Letters only",
        input: "",
        format: "regex",
      },
    ] as unknown as Parameters<typeof toFieldErrors>[0];
    expect(toFieldErrors(issues)).toEqual({ code: { type: "too_small", message: "Too short" } });
    expect(toFieldErrors(issues, "all")).toEqual({
      code: {
        type: "too_small",
        message: "Too short",
        types: { too_small: "Too short", invalid_format: "Letters only" },
      },
    });
  });
});

describe("fieldsFromSchema", () => {
  it("describes each field: label, control type, required and limits", () => {
    const customer = z.object({
      fullName: z.string().min(2).max(80).describe("Full name"),
      email: z.email(),
      website: z.url().optional(),
      age: z.number().int().min(0).max(120).optional(),
      creditLimit: z
        .number()
        .nonnegative()
        .meta({ fieldType: "money", label: "Credit limit (NZD)" }),
      since: z.date(),
      active: z.boolean().default(true),
      tier: z.enum(["bronze", "silver", "gold"]),
      notes: z.string().nullable(),
      tags: z.array(z.string()),
    });
    expect(fieldsFromSchema(customer)).toEqual([
      { name: "fullName", label: "Full name", type: "text", required: true, min: 2, max: 80 },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "website", label: "Website", type: "url", required: false },
      { name: "age", label: "Age", type: "number", required: false, min: 0, max: 120 },
      { name: "creditLimit", label: "Credit limit (NZD)", type: "money", required: true, min: 0 },
      { name: "since", label: "Since", type: "date", required: true },
      { name: "active", label: "Active", type: "boolean", required: false },
      {
        name: "tier",
        label: "Tier",
        type: "enum",
        required: true,
        options: ["bronze", "silver", "gold"],
      },
      { name: "notes", label: "Notes", type: "text", required: false },
      { name: "tags", label: "Tags", type: "custom", required: true },
    ]);
  });

  it("keeps other metadata and reads labels from wrapped schemas", () => {
    expect(
      fieldFromSchema("gst_number", z.string().meta({ placeholder: "123-456-789" }).optional()),
    ).toEqual({
      name: "gst_number",
      label: "Gst number",
      type: "text",
      required: false,
      meta: { placeholder: "123-456-789" },
    });
    expect(fieldFromSchema("x", z.string().describe("Inner label").optional()).label).toBe(
      "Inner label",
    );
  });
});

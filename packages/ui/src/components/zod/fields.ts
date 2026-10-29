import type { z } from "zod";

/** The kind of control a field needs. `money` comes from `.meta({ fieldType: "money" })`. */
export type FieldType =
  | "text"
  | "email"
  | "url"
  | "number"
  | "money"
  | "date"
  | "boolean"
  | "enum"
  | "custom";

/**
 * What a form needs to know about one field: enough to choose a control and label it. The start of
 * the `FieldDef` that generated forms build on.
 */
export interface FieldDef<Name extends string = string> {
  name: Name;
  /** From `.describe("…")` or `.meta({ label })`, otherwise the key in sentence case. */
  label: string;
  type: FieldType;
  /** `false` for `.optional()`, `.nullable()` and fields with a `.default()`. */
  required: boolean;
  /** `min` and `max` for numbers; the length limits for strings. */
  min?: number;
  max?: number;
  /** The choices of a `z.enum`. */
  options?: readonly string[];
  /** Anything else given to `.meta()`. */
  meta?: Record<string, unknown>;
}

type AnySchema = z.ZodType & {
  def: { type: string; innerType?: AnySchema; in?: AnySchema; out?: AnySchema };
  description?: string;
  meta?: () => Record<string, unknown> | undefined;
  isOptional?: () => boolean;
  isNullable?: () => boolean;
  minLength?: number | null;
  maxLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  format?: string | null;
  options?: readonly unknown[];
};

const WRAPPERS = new Set(["optional", "nullable", "default", "prefault", "readonly", "catch"]);

/** The schema under `.optional()`, `.nullable()`, `.default()` and the like. */
function unwrap(schema: AnySchema): AnySchema {
  let current = schema;
  for (let depth = 0; depth < 10; depth++) {
    const { type, innerType } = current.def;
    if (WRAPPERS.has(type) && innerType) current = innerType;
    else if (type === "pipe" && current.def.in) current = current.def.in;
    else break;
  }
  return current;
}

function metaOf(schema: AnySchema): Record<string, unknown> {
  // Metadata can sit on the wrapper or on the inner schema.
  return { ...unwrap(schema).meta?.(), ...schema.meta?.() };
}

function sentenceCase(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function finite(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function typeOf(inner: AnySchema, meta: Record<string, unknown>): FieldType {
  if (typeof meta.fieldType === "string") return meta.fieldType as FieldType;
  switch (inner.def.type) {
    case "string":
      if (inner.format === "email") return "email";
      if (inner.format === "url") return "url";
      return "text";
    case "number":
    case "bigint":
      return "number";
    case "date":
      return "date";
    case "boolean":
      return "boolean";
    case "enum":
      return "enum";
    default:
      return "custom";
  }
}

/** Describes one field of a schema. */
export function fieldFromSchema<Name extends string>(
  name: Name,
  schema: z.ZodType,
): FieldDef<Name> {
  const outer = schema as AnySchema;
  const inner = unwrap(outer);
  const meta = metaOf(outer);
  const { label, fieldType: _fieldType, description: _description, ...rest } = meta;
  const type = typeOf(inner, meta);
  const isString = inner.def.type === "string";
  const min = finite(isString ? inner.minLength : inner.minValue);
  const max = finite(isString ? inner.maxLength : inner.maxValue);
  const optional = outer.isOptional?.() ?? false;
  const nullable = outer.isNullable?.() ?? false;

  return {
    name,
    label:
      typeof label === "string"
        ? label
        : (outer.description ?? inner.description ?? sentenceCase(name)),
    type,
    required: !optional && !nullable,
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(inner.def.type === "enum" && { options: (inner.options ?? []).map(String) }),
    ...(Object.keys(rest).length > 0 && { meta: rest }),
  };
}

/**
 * Describes each field of a `z.object` schema, in order: name, label, the kind of control, whether
 * it is required, and its limits. Generated forms use it to choose and label controls.
 */
export function fieldsFromSchema<Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>,
): FieldDef<Extract<keyof Shape, string>>[] {
  return Object.entries(schema.shape).map(([name, field]) =>
    fieldFromSchema(name as Extract<keyof Shape, string>, field as z.ZodType),
  );
}

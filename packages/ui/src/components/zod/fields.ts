import type { z } from "zod";
import { type FieldDef, type FieldType, sentenceCase } from "../shared/field-def.js";

export type { FieldDef, FieldType };

type AnySchema = z.ZodType & {
  def: {
    type: string;
    innerType?: AnySchema;
    in?: AnySchema;
    out?: AnySchema;
    element?: AnySchema;
    /** The allowed values of a `z.literal`. */
    values?: readonly unknown[];
    /** True for `z.coerce.boolean()` and the other coercing schemas. */
    coerce?: boolean;
  };
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
    case "literal":
      // `z.literal(true)` is how a "must accept" checkbox is written.
      return inner.def.values?.length && inner.def.values.every((v) => typeof v === "boolean")
        ? "boolean"
        : "custom";
    case "array": {
      // An array of strings is how a group of checkboxes arrives in a post: one entry per ticked box.
      const element = inner.def.element && unwrap(inner.def.element).def.type;
      return element === "enum" || element === "string" ? "multiselect" : "custom";
    }
    default:
      return "custom";
  }
}

/** The choices of an enum, or of the enum an array holds. */
function optionsOf(inner: AnySchema): string[] | undefined {
  const source =
    inner.def.type === "array" && inner.def.element ? unwrap(inner.def.element) : inner;
  return source.def.type === "enum" ? (source.options ?? []).map(String) : undefined;
}

/**
 * The fields that use `z.coerce.boolean()`. It reads every non-empty string, "false" included, as
 * true, so a posted form cannot be validated with it.
 */
export function coercedBooleanFields(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.entries(schema.shape)
    .filter(([, field]) => {
      const inner = unwrap(field as AnySchema);
      return inner.def.type === "boolean" && inner.def.coerce === true;
    })
    .map(([name]) => name);
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
  const options = optionsOf(inner);

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
    ...(options && { options }),
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

import type { Schema } from "effect";
import { type FieldDef, type FieldType, sentenceCase } from "../shared/field-def.js";

export type { FieldDef, FieldType };

/** The parts of an Effect AST node this adapter reads, so it needs no runtime import from `effect`. */
interface AstLike {
  _tag: string;
  context?: { isOptional?: boolean };
  types?: readonly AstLike[];
  literal?: unknown;
  checks?: readonly {
    annotations?: {
      representation?: { id?: string; payload?: Record<string, unknown> | null };
    };
  }[];
  annotations?: Record<string, unknown>;
}

/**
 * The ids Effect gives its built-in checks, and the payload key each one's limit is under. Kept in
 * one place: if Effect renames one, `fields.test.ts` fails and this is the only line to change. An
 * exclusive bound (`isGreaterThan`) is left out on purpose: reporting it as a minimum would be wrong.
 */
const LIMITS: Record<string, { limit: "min" | "max"; key: string }[]> = {
  "effect/schema/isMinLength": [{ limit: "min", key: "minLength" }],
  "effect/schema/isMaxLength": [{ limit: "max", key: "maxLength" }],
  "effect/schema/isGreaterThanOrEqualTo": [{ limit: "min", key: "minimum" }],
  "effect/schema/isLessThanOrEqualTo": [{ limit: "max", key: "maximum" }],
  "effect/schema/isBetween": [
    { limit: "min", key: "minimum" },
    { limit: "max", key: "maximum" },
  ],
};

const NULLISH = new Set(["Null", "Undefined", "Void"]);

/** The one real member of `X | null | undefined`, and whether the value may be left empty. */
function unwrap(ast: AstLike): { inner: AstLike; nullable: boolean } {
  if (ast._tag !== "Union" || !ast.types) return { inner: ast, nullable: false };
  const real = ast.types.filter((member) => !NULLISH.has(member._tag));
  const nullable = real.length !== ast.types.length;
  const [only] = real;
  return { inner: real.length === 1 && only ? only : ast, nullable };
}

function typeOf(inner: AstLike): FieldType {
  switch (inner._tag) {
    case "String":
      return "text";
    case "Number":
    case "BigInt":
      return "number";
    case "Boolean":
      return "boolean";
    case "Union":
      return inner.types?.length && inner.types.every((member) => member._tag === "Literal")
        ? "enum"
        : "custom";
    default:
      return "custom";
  }
}

function limitsOf(inner: AstLike): { min?: number; max?: number } {
  const found: { min?: number; max?: number } = {};
  for (const check of inner.checks ?? []) {
    const representation = check.annotations?.representation;
    for (const { limit, key } of LIMITS[representation?.id ?? ""] ?? []) {
      const value = representation?.payload?.[key];
      if (typeof value === "number" && Number.isFinite(value)) found[limit] = value;
    }
  }
  return found;
}

/** Describes one field of a schema. */
export function fieldFromSchema<Name extends string>(
  name: Name,
  schema: Schema.Top,
): FieldDef<Name> {
  const outer = schema.ast as unknown as AstLike;
  const { inner, nullable } = unwrap(outer);
  const annotation = <T>(key: string): T | undefined =>
    (outer.annotations?.[key] ?? inner.annotations?.[key]) as T | undefined;

  const title = annotation<unknown>("title");
  const fieldType = annotation<unknown>("fieldType");
  const meta = annotation<unknown>("meta");
  const { min, max } = limitsOf(inner);
  const type = typeof fieldType === "string" ? (fieldType as FieldType) : typeOf(inner);

  return {
    name,
    label: typeof title === "string" ? title : sentenceCase(name),
    type,
    required: !outer.context?.isOptional && !nullable,
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(typeOf(inner) === "enum" && {
      options: (inner.types ?? []).map((member) => String(member.literal)),
    }),
    ...(typeof meta === "object" &&
      meta !== null &&
      Object.keys(meta).length > 0 && { meta: meta as Record<string, unknown> }),
  };
}

/**
 * Describes each field of an Effect `Schema.Struct`, in order: name, label, the kind of control,
 * whether it is required, and its limits. Generated forms use it to choose and label controls.
 */
export function fieldsFromSchema<Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
): FieldDef<Extract<keyof Fields, string>>[] {
  return Object.entries(schema.fields).map(([name, field]) =>
    fieldFromSchema(name as Extract<keyof Fields, string>, field as Schema.Top),
  );
}

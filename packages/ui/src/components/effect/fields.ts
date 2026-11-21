import { type Schema, SchemaAST } from "effect";
import { type FieldDef, type FieldType, sentenceCase } from "../shared/field-def.js";

export type { FieldDef, FieldType };

/** The parts of an Effect AST node this adapter reads. */
interface AstLike {
  _tag: string;
  context?: { isOptional?: boolean };
  types?: readonly AstLike[];
  /** An array's element types after its fixed ones: `Schema.Array(x)` has one, `x`. */
  rest?: readonly AstLike[];
  literal?: unknown;
  checks?: readonly {
    annotations?: {
      representation?: { id?: string; payload?: Record<string, unknown> | null };
    };
  }[];
  annotations?: Record<string, unknown>;
}

interface LimitRule {
  limit: "min" | "max";
  /** The payload key holding the number. */
  key: string;
  /** If this payload flag is true the bound is exclusive, and is left out. */
  exclusive?: string;
}

/**
 * The ids Effect gives its built-in checks, and where each one's limits are in its payload. Kept in
 * one place: if Effect renames one, `fields.test.ts` fails and this is the only table to change. An
 * exclusive bound (`isGreaterThan`, or `isBetween` with an exclusive flag) is left out on purpose:
 * reporting it as a limit would be wrong.
 */
const LIMITS: Record<string, LimitRule[]> = {
  "effect/schema/isMinLength": [{ limit: "min", key: "minLength" }],
  "effect/schema/isMaxLength": [{ limit: "max", key: "maxLength" }],
  "effect/schema/isGreaterThanOrEqualTo": [{ limit: "min", key: "minimum" }],
  "effect/schema/isLessThanOrEqualTo": [{ limit: "max", key: "maximum" }],
  "effect/schema/isBetween": [
    { limit: "min", key: "minimum", exclusive: "exclusiveMinimum" },
    { limit: "max", key: "maximum", exclusive: "exclusiveMaximum" },
  ],
};

/** The `representation.id` Effect gives its date schemas. */
const DATE_IDS = new Set(["effect/schema/Date", "effect/schema/DateTimeUtc"]);

const NULLISH = new Set(["Null", "Undefined", "Void"]);

/** The one real member of `X | null | undefined`, and whether the value may be left empty. */
function unwrap(ast: AstLike): { inner: AstLike; nullable: boolean } {
  if (ast._tag !== "Union" || !ast.types) return { inner: ast, nullable: false };
  const real = ast.types.filter((member) => !NULLISH.has(member._tag));
  const nullable = real.length !== ast.types.length;
  const [only] = real;
  return { inner: real.length === 1 && only ? only : ast, nullable };
}

/** The literals of a union made only of literals, as strings; `undefined` for anything else. */
function literalsOf(ast: AstLike): string[] | undefined {
  return ast._tag === "Union" && ast.types?.length && ast.types.every((m) => m._tag === "Literal")
    ? ast.types.map((member) => String(member.literal))
    : undefined;
}

/** The choices of `Schema.Array(Schema.Literals([...]))`, or `undefined` for any other array. */
function arrayChoices(ast: AstLike): string[] | undefined {
  return ast._tag === "Arrays" && ast.rest?.length === 1 && ast.rest[0]
    ? literalsOf(ast.rest[0])
    : undefined;
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
    case "Literal":
      // `Schema.Literal(true)` is how a "must accept" checkbox is written.
      return typeof inner.literal === "boolean" ? "boolean" : "custom";
    case "Declaration": {
      const representation = inner.annotations?.representation as { id?: string } | undefined;
      return DATE_IDS.has(representation?.id ?? "") ? "date" : "custom";
    }
    case "Union":
      return inner.types?.length && inner.types.every((member) => member._tag === "Literal")
        ? "enum"
        : "custom";
    case "Arrays":
      return arrayChoices(inner) ? "multiselect" : "custom";
    default:
      return "custom";
  }
}

function limitsOf(inner: AstLike): { min?: number; max?: number } {
  const found: { min?: number; max?: number } = {};
  for (const check of inner.checks ?? []) {
    const representation = check.annotations?.representation;
    for (const { limit, key, exclusive } of LIMITS[representation?.id ?? ""] ?? []) {
      const payload = representation?.payload;
      const value = payload?.[key];
      if (exclusive && payload?.[exclusive] === true) continue;
      if (typeof value === "number" && Number.isFinite(value)) found[limit] = value;
    }
  }
  return found;
}

/**
 * A node's annotations as Effect resolves them. `.annotate()` on a schema that has checks writes to
 * its last check, not to the node, so reading `ast.annotations` directly would miss a `title` given
 * after a `check`: `resolve` looks in the right place.
 */
const annotationsOf = (ast: AstLike): Record<string, unknown> =>
  (SchemaAST.resolve(ast as never) as Record<string, unknown> | undefined) ?? {};

/** Describes one field of a schema. */
export function fieldFromSchema<Name extends string>(
  name: Name,
  schema: Schema.Top,
): FieldDef<Name> {
  const outer = schema.ast as unknown as AstLike;
  const { inner, nullable } = unwrap(outer);
  const outerAnnotations = annotationsOf(outer);
  const innerAnnotations = inner === outer ? outerAnnotations : annotationsOf(inner);
  const annotation = (key: string): unknown => outerAnnotations[key] ?? innerAnnotations[key];

  const title = annotation("title");
  const fieldType = annotation("fieldType");
  const meta = annotation("meta");
  const { min, max } = limitsOf(inner);
  const kind = typeOf(inner);

  return {
    name,
    label: typeof title === "string" ? title : sentenceCase(name),
    type: typeof fieldType === "string" ? (fieldType as FieldType) : kind,
    required: !outer.context?.isOptional && !nullable,
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...(kind === "enum" && {
      options: (inner.types ?? []).map((member) => String(member.literal)),
    }),
    ...(kind === "multiselect" && { options: arrayChoices(inner) }),
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

import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

interface FieldError {
  type: string;
  message: string;
  types?: Record<string, string | string[]>;
}

function setIn(target: Record<string, unknown>, path: readonly PropertyKey[], error: FieldError) {
  let node = target;
  path.forEach((key, index) => {
    const name = String(key);
    if (index === path.length - 1) {
      node[name] = error;
      return;
    }
    const next = node[name];
    if (typeof next !== "object" || next === null) {
      // Array indexes get an array, so field-array errors look like React Hook Form's own.
      node[name] = typeof path[index + 1] === "number" ? [] : {};
    }
    node = node[name] as Record<string, unknown>;
  });
}

function getIn(
  target: Record<string, unknown>,
  path: readonly PropertyKey[],
): FieldError | undefined {
  let node: unknown = target;
  for (const key of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[String(key)];
  }
  return node as FieldError | undefined;
}

/** Turns Zod issues into React Hook Form errors, keyed by the field's path. */
export function toFieldErrors<Values extends FieldValues = FieldValues>(
  issues: readonly z.core.$ZodIssue[],
  criteriaMode: "firstError" | "all" = "firstError",
): FieldErrors<Values> {
  const errors: Record<string, unknown> = {};
  for (const issue of issues) {
    // An issue on the whole form (an object-level refine) goes to `root`, as React Hook Form expects.
    const path = issue.path.length > 0 ? issue.path : ["root"];
    const existing = getIn(errors, path);
    if (!existing) {
      setIn(errors, path, {
        type: issue.code,
        message: issue.message,
        ...(criteriaMode === "all" && { types: { [issue.code]: issue.message } }),
      });
    } else if (criteriaMode === "all" && existing.types) {
      const previous = existing.types[issue.code];
      existing.types[issue.code] =
        previous === undefined ? issue.message : [previous, issue.message].flat();
    }
  }
  return errors as FieldErrors<Values>;
}

/**
 * A React Hook Form resolver for a Zod 4 schema: `useForm({ resolver: zodResolver(schema) })`.
 * Runs `safeParseAsync`, so async refinements (a uniqueness check on the server) work. On success
 * the form receives the parsed output, with Zod's transforms and defaults applied. Issues land on
 * their field path, nested objects and arrays included; issues on the whole object go to `root`.
 */
export function zodResolver<Schema extends z.ZodType<FieldValues, FieldValues>>(
  schema: Schema,
): Resolver<z.input<Schema>, unknown, z.output<Schema>> {
  return async (values, _context, options) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data as z.output<Schema>, errors: {} };
    }
    return {
      values: {},
      errors: toFieldErrors<z.input<Schema>>(result.error.issues, options.criteriaMode),
    };
  };
}

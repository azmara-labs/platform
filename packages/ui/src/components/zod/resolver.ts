import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";
import { issuesToFieldErrors } from "../shared/field-errors.js";

/** Turns Zod issues into React Hook Form errors, keyed by the field's path. */
export function toFieldErrors<Values extends FieldValues = FieldValues>(
  issues: readonly z.core.$ZodIssue[],
  criteriaMode: "firstError" | "all" = "firstError",
): FieldErrors<Values> {
  return issuesToFieldErrors<Values>(
    issues.map((issue) => ({ path: issue.path, code: issue.code, message: issue.message })),
    criteriaMode,
  );
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

import { Cause, Effect, Exit, Schema, SchemaIssue } from "effect";
import type { FieldValues, Resolver } from "react-hook-form";
import { type FormIssue, issuesToFieldErrors } from "../shared/field-errors.js";

/** A failure in Standard Schema's shape, which is what Effect's issue formatter produces. */
export interface StandardIssue {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
}

/**
 * Reduces Standard Schema issues to the shared form. A path segment may be a plain key or a
 * `{ key }` object; a missing path means the whole form. Effect issues carry no code, so every
 * error is typed `validate`.
 */
export function toFormIssues(issues: readonly StandardIssue[]): FormIssue[] {
  return issues.map((issue) => ({
    path: (issue.path ?? []).map((segment) =>
      typeof segment === "object" ? segment.key : segment,
    ),
    code: "validate",
    message: issue.message,
  }));
}

/**
 * A React Hook Form resolver for an Effect Schema: `useForm({ resolver: effectSchemaResolver(schema) })`.
 * Every issue is reported, not just the first, each on its field path (nested objects and arrays
 * included); an issue on the whole value goes to `root`. Effectful checks, such as a uniqueness
 * test against a server, are awaited. On success the form receives the decoded value, so
 * transforms have run.
 *
 * An unexpected exception inside a refinement is not a validation error: it is rethrown as it was
 * thrown, rather than shown to the user as a message.
 */
export function effectSchemaResolver<S extends Schema.Codec<unknown, FieldValues, never, never>>(
  schema: S,
): Resolver<S["Encoded"], unknown, S["Type"]> {
  const decode = Schema.decodeUnknownEffect(schema);
  const format = SchemaIssue.makeFormatterStandardSchemaV1();
  return async (values, _context, options) => {
    const exit = await Effect.runPromiseExit(decode(values, { errors: "all" }));
    if (Exit.isSuccess(exit)) return { values: exit.value as S["Type"], errors: {} };

    const issues: StandardIssue[] = [];
    for (const reason of exit.cause.reasons) {
      if (Cause.isDieReason(reason)) throw reason.defect;
      if (Cause.isFailReason(reason)) issues.push(...format(reason.error.issue).issues);
    }
    // Nothing to show: the run was interrupted, not invalid. Surface it rather than pass it as valid.
    if (issues.length === 0) throw Cause.squash(exit.cause);

    return {
      values: {},
      errors: issuesToFieldErrors<S["Encoded"]>(toFormIssues(issues), options.criteriaMode),
    };
  };
}

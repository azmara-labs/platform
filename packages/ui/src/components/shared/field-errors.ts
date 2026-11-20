// Shared by the form adapters (`@azmr/ui/zod`, `@azmr/ui/effect`). Server-safe: no React, and only
// types from react-hook-form.

import type { FieldErrors, FieldValues } from "react-hook-form";

/** One validation failure, in the form every adapter reduces its own issues to. */
export interface FormIssue {
  /** Where it is: `["tags", 0, "label"]`. Empty for the whole form. */
  path: readonly PropertyKey[];
  /** What kind it is. React Hook Form stores it as the error's `type`. */
  code: string;
  message: string;
}

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

/**
 * Turns issues into React Hook Form errors, keyed by the field's path. An issue on the whole form
 * (an empty path) goes to `root`, as React Hook Form expects. With `criteriaMode: "all"` every message
 * of a field is collected by type.
 */
export function issuesToFieldErrors<Values extends FieldValues = FieldValues>(
  issues: readonly FormIssue[],
  criteriaMode: "firstError" | "all" = "firstError",
): FieldErrors<Values> {
  const errors: Record<string, unknown> = {};
  for (const issue of issues) {
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

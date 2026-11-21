// Shared by the form adapters (`@azmr/ui/zod`, `@azmr/ui/effect`). Server-safe: no React, no
// browser globals; `FormData` is the web-standard one that Node, Next.js server actions and edge
// runtimes all provide.

import type { FieldDef } from "./field-def.js";

/** Boolean controls post exactly this when ticked: a checkbox or switch posts its `value`, "on" by default. */
const TICKED = new Set(["on", "true"]);

const onlyStrings = (entries: FormDataEntryValue[]): string[] =>
  entries.filter((entry): entry is string => typeof entry === "string");

/** An own, enumerable property even if the name is `__proto__`, which plain assignment would turn into the prototype. */
function setOwn(target: Record<string, unknown>, name: string, value: unknown): void {
  Object.defineProperty(target, name, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Turns a posted `FormData` into the values a schema expects, so the same schema that validates a
 * form in the browser can validate the post on the server. It walks the schema's fields, never the
 * posted keys, so a key the schema does not declare (`isAdmin`, `__proto__`) is ignored.
 *
 * - `boolean`: `true` only for exactly one entry equal to `"on"` or `"true"`, and `false` when
 *   absent (an unticked checkbox posts nothing). Any other string, such as `"false"`, is passed
 *   through untouched, so the schema rejects it instead of it being read as true or false. That
 *   holds for `z.boolean()` and `z.literal(true)`; `z.coerce.boolean()` would read "false" as true,
 *   so `parseFormData` refuses it.
 * - `multiselect` (an array of an enum, or of strings): every string entry for the name, files
 *   dropped; `[]` when there are none, so one ticked box is still an array.
 * - everything else (`enum`, `text`, ...): the single string; left out when absent or a file; the
 *   array of strings when the key was posted more than once, so a single-value field's schema
 *   rejects it and the first entry is never silently taken.
 *
 * Values are not coerced further: numbers and dates reach the schema as the strings that were posted.
 */
export function formDataToValues(
  formData: FormData,
  fields: readonly FieldDef[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const entries = formData.getAll(field.name);
    const strings = onlyStrings(entries);

    if (field.type === "multiselect") {
      setOwn(values, field.name, strings);
    } else if (field.type === "boolean" && entries.length === 0) {
      setOwn(values, field.name, false);
    } else if (
      field.type === "boolean" &&
      entries.length === 1 &&
      strings.length === 1 &&
      TICKED.has(strings[0] as string)
    ) {
      setOwn(values, field.name, true);
    } else if (strings.length === 1) {
      setOwn(values, field.name, strings[0]);
    } else if (strings.length > 1) {
      setOwn(values, field.name, strings);
    }
  }
  return values;
}

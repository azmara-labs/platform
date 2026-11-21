import type { Schema } from "effect";
import type { FieldErrors, FieldValues } from "react-hook-form";
import { issuesToFieldErrors } from "../shared/field-errors.js";
import { formDataToValues } from "../shared/form-data.js";
import { fieldsFromSchema } from "./fields.js";
import { decodeForm } from "./resolver.js";

export type ParseFormDataResult<Output, Input extends FieldValues = FieldValues> =
  | { success: true; data: Output }
  | { success: false; errors: FieldErrors<Input> };

/**
 * Validates a posted `FormData` against an Effect `Schema.Struct`, on the server: for a Next.js
 * server action or a route handler. The schema is the one the form's resolver uses, so a tampered
 * post (a value outside a literal union, `terms=false`, a repeated key) fails here even though the
 * browser would never have sent it. Values are read through `formDataToValues`, which only looks at
 * the schema's own fields. Effectful checks are awaited.
 *
 * ```ts
 * const result = await parseFormData(schema, formData);
 * if (!result.success) return { errors: result.errors };
 * save(result.data);
 * ```
 */
export async function parseFormData<Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
  formData: FormData,
): Promise<ParseFormDataResult<Schema.Struct<Fields>["Type"], Schema.Struct<Fields>["Encoded"]>> {
  const values = formDataToValues(formData, fieldsFromSchema(schema));
  const decoded = await decodeForm(
    schema as unknown as Schema.Codec<unknown, Record<string, unknown>, never, never>,
    values,
  );
  if (decoded.ok) return { success: true, data: decoded.value as Schema.Struct<Fields>["Type"] };
  return {
    success: false,
    errors: issuesToFieldErrors<Schema.Struct<Fields>["Encoded"]>(decoded.issues),
  };
}

import type { FieldErrors, FieldValues } from "react-hook-form";
import type { z } from "zod";
import { formDataToValues } from "../shared/form-data.js";
import { fieldsFromSchema } from "./fields.js";
import { toFieldErrors } from "./resolver.js";

export type ParseFormDataResult<Output, Input extends FieldValues = FieldValues> =
  | { success: true; data: Output }
  | { success: false; errors: FieldErrors<Input> };

/**
 * Validates a posted `FormData` against a Zod object schema, on the server: for a Next.js server
 * action or a route handler. The schema is the one the form's resolver uses, so a tampered post (a
 * plan or tag outside the enum, `terms=false`, a repeated key) fails here even though the browser
 * would never have sent it. Values are read through `formDataToValues`, which only looks at the
 * schema's own fields. Async refinements run.
 *
 * ```ts
 * const result = await parseFormData(schema, formData);
 * if (!result.success) return { errors: result.errors };
 * save(result.data);
 * ```
 */
export async function parseFormData<Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>,
  formData: FormData,
): Promise<ParseFormDataResult<z.output<z.ZodObject<Shape>>, z.input<z.ZodObject<Shape>>>> {
  const values = formDataToValues(formData, fieldsFromSchema(schema));
  const result = await schema.safeParseAsync(values);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: toFieldErrors<z.input<z.ZodObject<Shape>>>(result.error.issues),
  };
}

// Shared by the form adapters (`@azmr/ui/zod`, `@azmr/ui/effect`). Server-safe: no React.

/** The kind of control a field needs. `money` comes from `.meta({ fieldType: "money" })`. */
export type FieldType =
  | "text"
  | "email"
  | "url"
  | "number"
  | "money"
  | "date"
  | "boolean"
  | "enum"
  | "custom";

/**
 * What a form needs to know about one field: enough to choose a control and label it. The start of
 * the `FieldDef` that generated forms build on.
 */
export interface FieldDef<Name extends string = string> {
  name: Name;
  /** From `.describe("…")` or `.meta({ label })`, otherwise the key in sentence case. */
  label: string;
  type: FieldType;
  /** `false` for `.optional()`, `.nullable()` and fields with a `.default()`. */
  required: boolean;
  /** `min` and `max` for numbers; the length limits for strings. */
  min?: number;
  max?: number;
  /** The choices of a `z.enum`. */
  options?: readonly string[];
  /** Anything else given to `.meta()`. */
  meta?: Record<string, unknown>;
}

/** A field key in sentence case: `invoiceEmail` becomes "Invoice email". */
export function sentenceCase(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

import type { ReactNode } from "react";
import {
  type Control,
  type FieldArrayPath,
  type FieldArrayWithId,
  type FieldValues,
  get,
  type FieldArray as RhfFieldArray,
  type UseFieldArrayProps,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";
import { FieldArray, type FieldArrayProps } from "../field-array/field-array.js";

type Row<Values extends FieldValues, Name extends FieldArrayPath<Values>> = FieldArrayWithId<
  Values,
  Name
>;

export interface FormFieldArrayProps<
  Values extends FieldValues = FieldValues,
  Name extends FieldArrayPath<Values> = FieldArrayPath<Values>,
> extends Omit<
    FieldArrayProps<Row<Values, Name>>,
    "items" | "getKey" | "name" | "onAdd" | "onRemove" | "onMove" | "error" | "footer"
  > {
  /** The array's path in the form values, such as `"lines"`. */
  name: Name;
  /** React Hook Form's array rules: `minLength`, `maxLength`, `required`, `validate`. */
  rules?: UseFieldArrayProps<Values, Name>["rules"];
  /** A new row's values. Shows the add button. */
  newItem?: () => RhfFieldArray<Values, Name>;
  /** Show a remove button on each row. Default `true`. */
  removable?: boolean;
  /** Show a drag handle on each row. Default `true`. */
  sortable?: boolean;
  /**
   * Totals and other values computed from the rows, from their current values: it re-renders as
   * people type, without re-rendering the rows.
   */
  footer?: (values: RhfFieldArray<Values, Name>[]) => ReactNode;
}

function WatchedFooter<Values extends FieldValues, Name extends FieldArrayPath<Values>>({
  control,
  name,
  render,
}: {
  control: Control<Values>;
  name: Name;
  render: (values: RhfFieldArray<Values, Name>[]) => ReactNode;
}) {
  const values = useWatch({ control, name: name as never }) as
    | RhfFieldArray<Values, Name>[]
    | undefined;
  return <>{render(values ?? [])}</>;
}

/**
 * A `FieldArray` bound to the surrounding `Form` through `useFieldArray`. Put `FormField`s in
 * each row with `row.name()`: `<FormField name={row.name("qty")} ...>`. The array's own error
 * (from `rules` or a schema) shows under its legend.
 */
export function FormFieldArray<
  Values extends FieldValues = FieldValues,
  Name extends FieldArrayPath<Values> = FieldArrayPath<Values>,
>({
  name,
  rules,
  newItem,
  removable = true,
  sortable = true,
  footer,
  ...props
}: FormFieldArrayProps<Values, Name>) {
  const { control } = useFormContext<Values>();
  const { fields, append, remove, move } = useFieldArray<Values, Name>({ control, name, rules });
  const { errors } = useFormState<Values>({ control, name: name as never });
  const own = get(errors, name) as
    | { message?: ReactNode; root?: { message?: ReactNode } }
    | undefined;
  const error = own?.root?.message ?? own?.message;

  return (
    <FieldArray<Row<Values, Name>>
      {...props}
      name={name}
      items={fields}
      getKey={(field) => field.id}
      error={error}
      // FieldArray moves focus itself, to the new row's first field.
      onAdd={newItem ? () => append(newItem(), { shouldFocus: false }) : undefined}
      onRemove={removable ? remove : undefined}
      onMove={sortable ? move : undefined}
      footer={
        footer
          ? () => <WatchedFooter<Values, Name> control={control} name={name} render={footer} />
          : undefined
      }
    />
  );
}

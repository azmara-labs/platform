import type { ReactNode } from "react";
import {
  type Control,
  type FieldArrayPath,
  type FieldArrayWithId,
  type FieldValues,
  get,
  type Path,
  type FieldArray as RhfFieldArray,
  type UseFieldArrayProps,
  type UseFieldArrayReturn,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";
import {
  FieldArray,
  type FieldArrayProps,
  type FieldArrayRow,
} from "../field-array/field-array.js";

type Row<Values extends FieldValues, Name extends FieldArrayPath<Values>> = FieldArrayWithId<
  Values,
  Name
>;

/** A `FieldArrayRow` whose `name()` returns a typed path, ready for `FormField`'s `name`. */
export interface FormFieldArrayRow<
  Values extends FieldValues = FieldValues,
  Name extends FieldArrayPath<Values> = FieldArrayPath<Values>,
> extends Omit<FieldArrayRow, "name"> {
  /**
   * A field's path in this row: `name("qty")` is `"lines.1.qty"`, typed for `FormField` when the
   * form's values are typed (`FormFieldArray<Values, "lines">`), and a plain string otherwise.
   */
  name: <Field extends RowField<Values, Name>>(field: Field) => RowPath<Values, Name, Field>;
}

// In an untyped form (values are FieldValues), paths are plain strings.
type RowField<
  Values extends FieldValues,
  Name extends FieldArrayPath<Values>,
> = FieldValues extends Values ? string : Path<RhfFieldArray<Values, Name>>;
type RowPath<
  Values extends FieldValues,
  Name extends string,
  Field extends string,
> = FieldValues extends Values ? string : `${Name}.${number}.${Field}`;

export interface FormFieldArrayProps<
  Values extends FieldValues = FieldValues,
  Name extends FieldArrayPath<Values> = FieldArrayPath<Values>,
> extends Omit<
    FieldArrayProps<Row<Values, Name>>,
    "items" | "getKey" | "name" | "onAdd" | "onRemove" | "onMove" | "error" | "footer" | "children"
  > {
  /** The array's path in the form values, such as `"lines"`. */
  name: Name;
  /**
   * React Hook Form's array rules: `minLength`, `maxLength`, `required`, `validate`. With
   * `fieldArray`, give them to your own `useFieldArray` instead.
   */
  rules?: UseFieldArrayProps<Values, Name>["rules"];
  /**
   * Your own `useFieldArray({ name })` result, for changing the rows from elsewhere in the form,
   * such as `replace()` from an "Add from catalog" picker. Without it, `FormFieldArray` calls
   * `useFieldArray` itself.
   */
  fieldArray?: UseFieldArrayReturn<Values, Name>;
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
  /** Renders a row's fields. Put a `FormField` per field, named with `row.name()`. */
  children: (item: Row<Values, Name>, row: FormFieldArrayRow<Values, Name>) => ReactNode;
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

function BoundFieldArray<Values extends FieldValues, Name extends FieldArrayPath<Values>>({
  name,
  rules: _rules,
  fieldArray,
  newItem,
  removable = true,
  sortable = true,
  footer,
  children,
  ...props
}: FormFieldArrayProps<Values, Name> & { fieldArray: UseFieldArrayReturn<Values, Name> }) {
  const { control } = useFormContext<Values>();
  const { fields, append, remove, move } = fieldArray;
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
    >
      {/* Same function at runtime; only the type of row.name() is narrower. */}
      {(item, row) => children(item, row as FormFieldArrayRow<Values, Name>)}
    </FieldArray>
  );
}

function OwnFieldArray<Values extends FieldValues, Name extends FieldArrayPath<Values>>(
  props: FormFieldArrayProps<Values, Name>,
) {
  const { control } = useFormContext<Values>();
  const fieldArray = useFieldArray<Values, Name>({ control, name: props.name, rules: props.rules });
  return <BoundFieldArray<Values, Name> {...props} fieldArray={fieldArray} />;
}

/**
 * A `FieldArray` bound to the surrounding `Form` through `useFieldArray`. Put `FormField`s in
 * each row with `row.name()`: `<FormField name={row.name("qty")} ...>`. The array's own error
 * (from `rules` or a schema) shows under its legend. Pass `fieldArray` to use your own
 * `useFieldArray` result, so other parts of the form can change the rows.
 */
export function FormFieldArray<
  Values extends FieldValues = FieldValues,
  Name extends FieldArrayPath<Values> = FieldArrayPath<Values>,
>(props: FormFieldArrayProps<Values, Name>) {
  return props.fieldArray ? (
    <BoundFieldArray<Values, Name> {...props} fieldArray={props.fieldArray} />
  ) : (
    <OwnFieldArray<Values, Name> {...props} />
  );
}

import { forwardRef, type ReactNode, useState } from "react";
import { CheckboxGroup as CheckboxGroupPrimitive } from "../../primitives/checkbox-group.js";
import { Checkbox } from "./checkbox.js";
import { ChoiceGroupShell, useWarnDuplicateValues, withUniqueKeys } from "./group.js";
import type { ChoiceOption, ChoiceSize, Named } from "./types.js";

type GroupBase = {
  description?: ReactNode;
  /** Shown under the group and read out as its description. */
  error?: ReactNode;
  /** Shows the required marker on the legend. */
  required?: boolean;
  /** Applied to every checkbox unless it sets its own. */
  size?: ChoiceSize;
  orientation?: "horizontal" | "vertical";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Every ticked checkbox posts its `value` under this name. */
  name?: string;
  disabled?: boolean;
  /**
   * With hand-written children and a `parent` checkbox: the values it ticks and unticks. Leave out
   * disabled ones, so select all never changes them. With `options`, `selectAllLabel` does this.
   */
  allValues?: readonly string[];
  /** With `options`: adds a "select all" checkbox first. It shows mixed while only some are ticked. */
  selectAllLabel?: ReactNode;
  className?: string;
};

export type CheckboxGroupProps = GroupBase &
  Named &
  (
    | {
        /** The choices. Each is `{ value, label, description?, disabled? }` and nothing else is read. */
        options: readonly ChoiceOption[];
        children?: never;
      }
    | {
        /** `Checkbox`es with a `value`, for layouts `options` does not cover. */
        children: ReactNode;
        options?: never;
      }
  );

/**
 * A group of checkboxes sharing one array of ticked values, named by its legend. Pass `options`, or
 * write the `Checkbox`es yourself: `options` renders the same ones. Values this group does not know
 * (a stale selection from a server) are kept when others are toggled.
 */
export const CheckboxGroup = Object.assign(
  forwardRef<HTMLDivElement, CheckboxGroupProps>(function CheckboxGroup(
    {
      description,
      error,
      required,
      size,
      orientation = "vertical",
      value,
      defaultValue,
      onValueChange,
      name,
      disabled,
      allValues,
      selectAllLabel,
      className,
      options,
      children,
      ...rest
    },
    ref,
  ) {
    useWarnDuplicateValues(options, "CheckboxGroup");
    // Base UI's select-all needs a controlled group, so the group always is one: an uncontrolled
    // caller's value is held here.
    const [held, setHeld] = useState<string[]>(defaultValue ?? []);
    const current = value ?? held;
    const { label, ...aria } = rest as typeof rest & {
      label?: ReactNode;
      "aria-label"?: string;
      "aria-labelledby"?: string;
    };

    // What select all controls: the caller's `allValues`, or every ENABLED option.
    const parentValues =
      allValues ??
      (options && selectAllLabel !== undefined
        ? options.filter((option) => !option.disabled).map((option) => option.value)
        : undefined);

    // Base UI works out the select-all state by comparing array LENGTHS, so it must only ever see
    // the values select all controls. Disabled options and values the group does not know stay here,
    // outside it, and are added back to whatever it reports.
    const controlled = parentValues ? new Set(parentValues) : null;
    const seen = controlled ? current.filter((item) => controlled.has(item)) : current;
    const kept = controlled ? current.filter((item) => !controlled.has(item)) : [];

    const handleChange = (next: string[]) => {
      const merged = controlled ? [...next, ...kept] : next;
      if (value === undefined) setHeld(merged);
      onValueChange?.(merged);
    };

    return (
      <ChoiceGroupShell
        label={label}
        description={description}
        error={error}
        required={required}
        size={size}
        orientation={orientation}
        itemName={name}
        className={className}
        group={({ describedBy }) => (
          <CheckboxGroupPrimitive
            ref={ref}
            value={seen}
            onValueChange={handleChange}
            disabled={disabled}
            {...(parentValues ? { allValues: [...parentValues] } : {})}
            // Only the props that are set: an explicit `undefined` would override the legend's
            // `aria-labelledby`. `aria-invalid` and `aria-required` are not allowed on role=group, so
            // the error and the required marker reach screen readers through the description and legend.
            {...(aria["aria-label"] ? { "aria-label": aria["aria-label"] } : {})}
            {...(aria["aria-labelledby"] ? { "aria-labelledby": aria["aria-labelledby"] } : {})}
            {...(describedBy ? { "aria-describedby": describedBy } : {})}
          />
        )}
      >
        {options ? (
          <>
            {selectAllLabel !== undefined ? <Checkbox parent label={selectAllLabel} /> : null}
            {withUniqueKeys(options).map(([key, option]) => (
              <Checkbox
                key={key}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
              />
            ))}
          </>
        ) : (
          children
        )}
      </ChoiceGroupShell>
    );
  }),
  // Read by `FormField` (`@azmr/ui/rhf`), which binds `value` (a string array) and `onValueChange`.
  { choiceControl: "values" as const },
);

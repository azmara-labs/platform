import { type ComponentPropsWithoutRef, type FocusEvent, forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Radio as RadioPrimitive } from "../../primitives/radio.js";
import { RadioGroup as RadioGroupPrimitive } from "../../primitives/radio-group.js";
import {
  ChoiceGroupShell,
  leavesGroup,
  useChoiceSize,
  useWarnDuplicateValues,
  withUniqueKeys,
} from "./group.js";
import { ChoiceRow } from "./row.js";
import type { ChoiceOption, ChoiceSize, Named } from "./types.js";
import { boxVariants, focusRing } from "./variants.js";

type RadioPrimitiveProps = Omit<
  ComponentPropsWithoutRef<typeof RadioPrimitive.Root>,
  "className" | "children" | "render" | "id" | "value" | "aria-label" | "aria-labelledby"
>;

export type RadioProps = RadioPrimitiveProps &
  Named & {
    /** What the group reports when this radio is chosen. */
    value: string;
    /** Help text under the label, read out after it. */
    description?: ReactNode;
    /** Overrides the group's size. */
    size?: ChoiceSize;
    className?: string;
  };

/** One radio in a `RadioGroup`, with its label beside it. */
export const Radio = forwardRef<HTMLElement, RadioProps>(function Radio(
  { size, description, className, disabled, value, ...rest },
  ref,
) {
  const resolved = useChoiceSize(size);
  // `label` is one arm of the `Named` union, so it is read off `rest` before the rest reaches Base UI.
  const { label, ...control } = rest as typeof rest & { label?: ReactNode };
  return (
    <ChoiceRow
      item
      size={resolved}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
    >
      <RadioPrimitive.Root
        ref={ref}
        value={value}
        disabled={disabled}
        className={cn(
          boxVariants({ size: resolved }),
          "inline-flex items-center justify-center rounded-full border border-input bg-background text-primary-foreground transition-colors duration-(--motion-duration-fast) ease-standard",
          "data-[checked]:border-primary data-[checked]:bg-primary data-[invalid]:border-destructive data-[disabled]:cursor-not-allowed",
          focusRing,
        )}
        {...control}
      >
        <RadioPrimitive.Indicator className="flex items-center justify-center before:size-1.5 before:rounded-full before:bg-current data-[unchecked]:hidden" />
      </RadioPrimitive.Root>
    </ChoiceRow>
  );
});

type GroupBase = {
  description?: ReactNode;
  /** Marks the group invalid and shows the message under it. */
  error?: ReactNode;
  required?: boolean;
  /** Applied to every radio unless it sets its own. */
  size?: ChoiceSize;
  /** Layout only. Every arrow key moves between radios either way, as WAI-ARIA asks. */
  orientation?: "horizontal" | "vertical";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Posted with the chosen radio's value. */
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Called when focus leaves the group, not when it moves between the radios inside it. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  className?: string;
};

export type RadioGroupProps = GroupBase &
  Named &
  (
    | {
        /** The choices. Each is `{ value, label, description?, disabled? }` and nothing else is read. */
        options: readonly ChoiceOption[];
        children?: never;
      }
    | {
        /** `Radio`s, for layouts `options` does not cover. */
        children: ReactNode;
        options?: never;
      }
  );

/**
 * A group of radios, named by its legend. Pass `options`, or write the `Radio`s yourself: `options`
 * renders the same `Radio`s. Tab enters the group once; the arrow keys move and select.
 */
export const RadioGroup = Object.assign(
  forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
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
      readOnly,
      onBlur,
      className,
      options,
      children,
      ...rest
    },
    ref,
  ) {
    useWarnDuplicateValues(options, "RadioGroup");
    const { label, ...aria } = rest as typeof rest & {
      label?: ReactNode;
      "aria-label"?: string;
      "aria-labelledby"?: string;
    };
    return (
      <ChoiceGroupShell
        label={label}
        description={description}
        error={error}
        required={required}
        size={size}
        orientation={orientation}
        className={className}
        group={({ describedBy, invalid }) => (
          <RadioGroupPrimitive
            ref={ref}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onValueChange={onValueChange ? (next: string) => onValueChange(next) : undefined}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            {...(onBlur ? { onBlur: leavesGroup(onBlur) } : {})}
            // Only the props that are set: an explicit `undefined` would override the legend's
            // `aria-labelledby`, which Base UI merges in.
            {...(aria["aria-label"] ? { "aria-label": aria["aria-label"] } : {})}
            {...(aria["aria-labelledby"] ? { "aria-labelledby": aria["aria-labelledby"] } : {})}
            {...(describedBy ? { "aria-describedby": describedBy } : {})}
            {...(invalid ? { "aria-invalid": true as const } : {})}
          />
        )}
      >
        {options
          ? withUniqueKeys(options).map(([key, option]) => (
              <Radio
                key={key}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
              />
            ))
          : children}
      </ChoiceGroupShell>
    );
  }),
  // Read by `FormField` (`@azmr/ui/rhf`), which binds `value` (one string) and `onValueChange`.
  { choiceControl: "value" as const },
);

import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { Check, Minus } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Checkbox as CheckboxPrimitive } from "../../primitives/checkbox.js";
import { useChoiceGroup, useChoiceSize } from "./group.js";
import { ChoiceRow } from "./row.js";
import type { ChoiceSize, Named } from "./types.js";
import { boxVariants, focusRing } from "./variants.js";

type PrimitiveProps = Omit<
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
  "className" | "children" | "render" | "id" | "aria-label" | "aria-labelledby"
>;

export type CheckboxProps = PrimitiveProps &
  Named & {
    /** Inside a group, overrides the group's size. */
    size?: ChoiceSize;
    /** Help text under the label, read out after it. */
    description?: ReactNode;
    /** Marks the checkbox invalid and shows the message under it. Not used inside a group. */
    error?: ReactNode;
    className?: string;
  };

/**
 * A checkbox with its label beside it. `checked` is a boolean; for the mixed state set the separate
 * `indeterminate` prop (it is not `checked="indeterminate"`). Space toggles it. Inside a
 * `CheckboxGroup` give it a `value`; with `parent` it ticks and unticks the group's `allValues`.
 */
export const Checkbox = forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  { size, description, error, className, required, disabled, name, ...rest },
  ref,
) {
  const group = useChoiceGroup();
  const resolved = useChoiceSize(size);
  // `label` is one arm of the `Named` union, so it is read off `rest` before the rest reaches Base UI.
  const { label, ...control } = rest as typeof rest & { label?: ReactNode };
  // The select-all checkbox is not a value of the group, so it never posts under the group's name.
  const postName = control.parent ? undefined : (name ?? group?.name);
  return (
    <ChoiceRow
      item={group !== null}
      size={resolved}
      label={label}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      className={className}
    >
      <CheckboxPrimitive.Root
        ref={ref}
        name={postName}
        required={required}
        disabled={disabled}
        className={cn(
          boxVariants({ size: resolved }),
          "inline-flex items-center justify-center rounded-sm border border-input bg-background text-primary-foreground transition-colors duration-(--motion-duration-fast) ease-standard",
          "data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
          "data-[invalid]:border-destructive data-[disabled]:cursor-not-allowed",
          focusRing,
        )}
        {...control}
      >
        <CheckboxPrimitive.Indicator
          className="flex items-center justify-center data-[unchecked]:hidden"
          render={(indicatorProps, indicatorState) => (
            <span {...indicatorProps}>
              <Icon icon={indicatorState.indeterminate ? Minus : Check} size="xs" />
            </span>
          )}
        />
      </CheckboxPrimitive.Root>
    </ChoiceRow>
  );
});

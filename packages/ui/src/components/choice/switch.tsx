import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Switch as SwitchPrimitive } from "../../primitives/switch.js";
import { ChoiceRow } from "./row.js";
import type { ChoiceSize, Named } from "./types.js";
import { focusRing, thumbVariants, trackVariants } from "./variants.js";

type PrimitiveProps = Omit<
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
  "className" | "children" | "render" | "id" | "aria-label" | "aria-labelledby" | "uncheckedValue"
>;

export type SwitchProps = PrimitiveProps &
  Named & {
    size?: ChoiceSize;
    /** Help text under the label, read out after it. */
    description?: ReactNode;
    /** Marks the switch invalid and shows the message under it. */
    error?: ReactNode;
    className?: string;
  };

/**
 * An on/off switch with its label beside it. Space toggles it. It posts its `name` (with `value`,
 * default "on") only when it is on, like a checkbox.
 */
export const Switch = Object.assign(
  forwardRef<HTMLElement, SwitchProps>(function Switch(
    { size, description, error, className, required, disabled, ...rest },
    ref,
  ) {
    // `label` is one arm of the `Named` union, so it is read off `rest` before the rest reaches Base UI.
    const { label, ...control } = rest as typeof rest & { label?: ReactNode };
    return (
      <ChoiceRow
        size={size}
        kind="switch"
        label={label}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        className={className}
      >
        <SwitchPrimitive.Root
          ref={ref}
          required={required}
          disabled={disabled}
          className={cn(trackVariants({ size }), focusRing)}
          {...control}
        >
          <SwitchPrimitive.Thumb className={thumbVariants({ size })} />
        </SwitchPrimitive.Root>
      </ChoiceRow>
    );
  }),
  // Read by `FormField` (`@azmr/ui/rhf`), which binds `checked` and `onCheckedChange`.
  { choiceControl: "checked" as const },
);

import type { ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Field as FieldPrimitive } from "../../primitives/field.js";
import { FieldDescription, FieldError, FieldRoot } from "../field/field.js";
import type { ChoiceSize } from "./types.js";
import { choiceVariants, descriptionVariants } from "./variants.js";

export interface ChoiceRowProps {
  size?: ChoiceSize;
  label?: ReactNode;
  description?: ReactNode;
  /** Any value other than `undefined`, `null`, `false` or `""` marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** The Base UI control, drawn as the box, radio or switch. */
  children: ReactNode;
}

export function hasError(error: ReactNode): boolean {
  return error !== undefined && error !== null && error !== false && error !== "";
}

/**
 * A single choice: the control with its label BESIDE it (not above, as in `Field`), the description
 * under the label text, and the error in a polite live region. Base UI's `Field` ties the label,
 * description and error to the control. The label and description are rendered as React children, so
 * any markup in them is escaped text.
 */
export function ChoiceRow({
  size,
  label,
  description,
  error,
  required,
  disabled,
  className,
  children,
}: ChoiceRowProps) {
  const showError = hasError(error);
  const rowClass = choiceVariants({ size });
  return (
    <FieldRoot invalid={showError} disabled={disabled} className={cn("gap-0", className)}>
      {label !== undefined ? (
        <FieldPrimitive.Label className={rowClass}>
          {children}
          <span>
            {label}
            {required ? (
              <span aria-hidden="true" className="ms-0.5 text-destructive">
                *
              </span>
            ) : null}
          </span>
        </FieldPrimitive.Label>
      ) : (
        <div className={rowClass}>{children}</div>
      )}
      {description !== undefined ? (
        <FieldDescription className={descriptionVariants({ size })}>{description}</FieldDescription>
      ) : null}
      <div aria-live="polite" className="empty:hidden">
        {showError ? (
          <FieldError
            match
            className={cn(descriptionVariants({ size }), "font-medium text-destructive")}
          >
            {error}
          </FieldError>
        ) : null}
      </div>
    </FieldRoot>
  );
}

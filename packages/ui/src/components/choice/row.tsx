import type { ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Field as FieldPrimitive } from "../../primitives/field.js";
import { FieldDescription, FieldError, FieldRoot } from "../field/field.js";
import type { ChoiceSize } from "./types.js";
import { choiceVariants, descriptionVariants, switchDescriptionVariants } from "./variants.js";

export interface ChoiceRowProps {
  size?: ChoiceSize;
  /** `switch` has a wider control, so the description and error start further in. Default `box`. */
  kind?: "box" | "switch";
  /**
   * An option inside a group. It joins the group's `Field` (Base UI's `Field.Item`) instead of
   * starting its own, and has no error of its own: the group shows that.
   */
  item?: boolean;
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

/** The red `*` after a label. Screen readers hear `aria-required` on the control instead. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ms-0.5 text-destructive">
      *
    </span>
  );
}

/**
 * A single choice: the control with its label BESIDE it (not above, as in `Field`), the description
 * under the label text, and the error in a polite live region. Base UI's `Field` ties the label,
 * description and error to the control. The label and description are rendered as React children, so
 * any markup in them is escaped text.
 */
export function ChoiceRow({
  size,
  kind = "box",
  item,
  label,
  description,
  error,
  required,
  disabled,
  className,
  children,
}: ChoiceRowProps) {
  const showError = !item && hasError(error);
  const rowClass = choiceVariants({ size });
  const indent = (kind === "switch" ? switchDescriptionVariants : descriptionVariants)({ size });
  const body = (
    <>
      {label !== undefined ? (
        <FieldPrimitive.Label className={rowClass}>
          {children}
          <span>
            {label}
            {required ? <RequiredMark /> : null}
          </span>
        </FieldPrimitive.Label>
      ) : (
        <div className={rowClass}>{children}</div>
      )}
      {description !== undefined ? (
        <FieldDescription className={indent}>{description}</FieldDescription>
      ) : null}
      {item ? null : (
        <div aria-live="polite" className="empty:hidden">
          {showError ? (
            <FieldError match className={cn(indent, "font-medium text-destructive")}>
              {error}
            </FieldError>
          ) : null}
        </div>
      )}
    </>
  );
  if (item) {
    return (
      <FieldPrimitive.Item disabled={disabled} className={cn("flex flex-col", className)}>
        {body}
      </FieldPrimitive.Item>
    );
  }
  return (
    <FieldRoot invalid={showError} disabled={disabled} className={cn("gap-0", className)}>
      {body}
    </FieldRoot>
  );
}

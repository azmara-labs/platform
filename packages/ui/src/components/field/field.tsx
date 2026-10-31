import {
  Children,
  type ComponentPropsWithoutRef,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { cn } from "../../lib/cn.js";
import { Field as FieldPrimitive } from "../../primitives/field.js";

type Classed<T> = Omit<T, "className"> & { className?: string };

/** Groups a control with its label, description and error. Base UI wires the ids between them. */
export const FieldRoot = forwardRef<
  HTMLDivElement,
  Classed<ComponentPropsWithoutRef<typeof FieldPrimitive.Root>>
>(function FieldRoot({ className, ...props }, ref) {
  return (
    <FieldPrimitive.Root ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
});

export type FieldLabelProps = Classed<ComponentPropsWithoutRef<typeof FieldPrimitive.Label>> & {
  /** Shows a required marker. It is hidden from screen readers, which hear `aria-required` on the control instead. */
  required?: boolean;
};

/** The control's `<label>`, associated with it automatically. */
export const FieldLabel = forwardRef<HTMLElement, FieldLabelProps>(function FieldLabel(
  { className, required, children, ...props },
  ref,
) {
  return (
    <FieldPrimitive.Label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none text-foreground data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ms-0.5 text-destructive">
          *
        </span>
      ) : null}
    </FieldPrimitive.Label>
  );
});

/** Help text for the control, read out after its label through `aria-describedby`. */
export const FieldDescription = forwardRef<
  HTMLParagraphElement,
  Classed<ComponentPropsWithoutRef<typeof FieldPrimitive.Description>>
>(function FieldDescription({ className, ...props }, ref) {
  return (
    <FieldPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

/**
 * The error message. With no `match` it shows the field's own validation messages (the `validate`
 * prop or native constraints); pass `match` to show it whenever an outside library, such as
 * React Hook Form, says the field is invalid.
 */
export const FieldError = forwardRef<
  HTMLDivElement,
  Classed<ComponentPropsWithoutRef<typeof FieldPrimitive.Error>>
>(function FieldError({ className, ...props }, ref) {
  return (
    <FieldPrimitive.Error
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    />
  );
});

export interface FieldProps
  extends Classed<Omit<ComponentPropsWithoutRef<typeof FieldPrimitive.Root>, "children">> {
  label?: ReactNode;
  description?: ReactNode;
  /**
   * The error to show, for example `errors.email?.message` from React Hook Form. Any value
   * other than `undefined`, `null`, `false` or `""` marks the field invalid.
   */
  error?: ReactNode;
  /** Shows the required marker and sets `aria-required` on the control. */
  required?: boolean;
  /**
   * One control: `Input`, `Textarea` or any Base UI control. For any other control, such as a
   * Radix Select trigger, a native `<select>` or a third-party picker, pass a function: it gets
   * the `id` and ARIA props to spread on the control, so the label, description and error are
   * wired to it too.
   */
  children: ReactNode | ((control: FieldControlProps) => ReactNode);
}

/** What a function child of `Field` spreads on its control. */
export interface FieldControlProps {
  id: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  "aria-errormessage"?: string;
}

function hasError(error: ReactNode): boolean {
  return error !== undefined && error !== null && error !== false && error !== "";
}

/**
 * A labelled form control. Wraps one control and wires `id`, `aria-labelledby`,
 * `aria-describedby`, `aria-invalid` and `aria-errormessage` for it. Errors appear in a polite
 * live region, so screen readers announce them when they arrive. Use the parts (`FieldRoot`,
 * `FieldLabel`, `FieldDescription`, `FieldError`) for layouts this one doesn't cover.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, description, error, required, invalid, children, ...props },
  ref,
) {
  const errorId = useId();
  const controlId = useId();
  const labelId = useId();
  const descriptionId = useId();
  const showError = hasError(error);
  // A function child is a control Base UI doesn't know about, so the ids are wired here instead.
  const custom = typeof children === "function";
  let control: ReactNode;
  if (custom) {
    const describedBy = [
      description !== undefined ? descriptionId : undefined,
      showError ? errorId : undefined,
    ].filter(Boolean);
    control = children({
      id: controlId,
      ...(label !== undefined ? { "aria-labelledby": labelId } : {}),
      ...(describedBy.length > 0 ? { "aria-describedby": describedBy.join(" ") } : {}),
      ...(showError || invalid ? { "aria-invalid": true as const } : {}),
      ...(required ? { "aria-required": true as const } : {}),
      ...(showError ? { "aria-errormessage": errorId } : {}),
    });
  } else {
    const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
    control = only
      ? cloneElement(only as ReactElement<Record<string, unknown>>, {
          ...(required ? { "aria-required": true } : {}),
          ...(showError ? { "aria-errormessage": errorId } : {}),
        })
      : children;
  }

  return (
    <FieldRoot ref={ref} invalid={showError || invalid} {...props}>
      {label !== undefined ? (
        <FieldLabel required={required} {...(custom ? { id: labelId, htmlFor: controlId } : {})}>
          {label}
        </FieldLabel>
      ) : null}
      {description !== undefined ? (
        <FieldDescription {...(custom ? { id: descriptionId } : {})}>
          {description}
        </FieldDescription>
      ) : null}
      {control}
      {/* Always mounted, so the error is announced when it appears. The negative margin cancels
          the gap while it is empty. */}
      <div aria-live="polite" className="empty:-mt-1.5">
        {/* No `children` key at all without an error: even `children={undefined}` stops Base UI
            showing the field's own validation message. */}
        <FieldError id={errorId} {...(showError ? { match: true, children: error } : {})} />
      </div>
    </FieldRoot>
  );
});

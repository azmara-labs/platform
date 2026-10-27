import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn.js";
import { Fieldset as FieldsetPrimitive } from "../../primitives/fieldset.js";

type Classed<T> = Omit<T, "className"> & { className?: string };

/** A `<fieldset>` labelled by its legend. `disabled` disables every control inside it. */
export const FieldsetRoot = forwardRef<
  HTMLElement,
  Classed<ComponentPropsWithoutRef<typeof FieldsetPrimitive.Root>>
>(function FieldsetRoot({ className, ...props }, ref) {
  return (
    <FieldsetPrimitive.Root
      ref={ref}
      className={cn("m-0 flex min-w-0 flex-col gap-4 border-0 p-0", className)}
      {...props}
    />
  );
});

/** The fieldset's caption. Screen readers read it before the label of each control inside. */
export const FieldsetLegend = forwardRef<
  HTMLDivElement,
  Classed<ComponentPropsWithoutRef<typeof FieldsetPrimitive.Legend>>
>(function FieldsetLegend({ className, ...props }, ref) {
  return (
    <FieldsetPrimitive.Legend
      ref={ref}
      className={cn(
        "text-base font-semibold leading-tight text-foreground data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export interface FieldsetProps
  extends Classed<Omit<ComponentPropsWithoutRef<typeof FieldsetPrimitive.Root>, "children">> {
  /** The caption for the group, for example "Delivery address". */
  legend: ReactNode;
  description?: ReactNode;
  /**
   * An error for the group as a whole, such as "Choose a delivery option" on a radio group. Any
   * value other than `undefined`, `null`, `false` or `""` counts as an error.
   */
  error?: ReactNode;
  /** The grouped controls, usually `Field`s, radios or checkboxes. */
  children: ReactNode;
}

function hasError(error: ReactNode): boolean {
  return error !== undefined && error !== null && error !== false && error !== "";
}

/**
 * Groups related controls under a legend, such as the parts of an address or the options of a
 * radio group. The description and any group error are read with the legend through
 * `aria-describedby`; errors arrive in a polite live region. Use `FieldsetRoot` and
 * `FieldsetLegend` for layouts this one doesn't cover.
 */
export const Fieldset = forwardRef<HTMLElement, FieldsetProps>(function Fieldset(
  { legend, description, error, children, className, "aria-describedby": describedBy, ...props },
  ref,
) {
  const descriptionId = useId();
  const errorId = useId();
  const showError = hasError(error);
  const ids = [
    describedBy,
    description !== undefined ? descriptionId : undefined,
    showError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldsetRoot
      ref={ref}
      aria-describedby={ids || undefined}
      data-invalid={showError ? "" : undefined}
      className={className}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <FieldsetLegend>{legend}</FieldsetLegend>
        {description !== undefined ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {/* Always mounted, so a group error is announced when it appears. */}
        <div aria-live="polite">
          {showError ? (
            <p id={errorId} className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </FieldsetRoot>
  );
});

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Field as FieldPrimitive } from "../../primitives/field.js";

export interface TextareaProps
  extends Omit<ComponentPropsWithoutRef<"textarea">, "className" | "defaultValue"> {
  className?: string;
  defaultValue?: string;
  /** Grows with its content (CSS `field-sizing: content`) instead of scrolling. */
  autoResize?: boolean;
  /** Typed alternative to `onChange`; both fire. */
  onValueChange?: (value: string) => void;
}

/**
 * A multi-line text input. `ref` is the real `<textarea>`, so `react-hook-form`'s `register()`
 * works with no `Controller`. Inside a `Field` it is labelled and described automatically.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, autoResize, rows = 3, onValueChange, ...props },
  ref,
) {
  return (
    <FieldPrimitive.Control
      ref={ref as never}
      render={<textarea rows={rows} />}
      onValueChange={onValueChange ? (value) => onValueChange(value) : undefined}
      className={cn(
        "flex min-h-16 w-full min-w-0 rounded-md border border-input bg-background px-(--density-control-padding-x) py-2 text-sm text-foreground",
        "transition-colors duration-(--motion-duration-fast) ease-standard",
        "outline-none placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-destructive data-[invalid]:border-destructive",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 read-only:bg-muted",
        autoResize ? "resize-none field-sizing-content" : "resize-y",
        className,
      )}
      {...(props as ComponentPropsWithoutRef<typeof FieldPrimitive.Control>)}
    />
  );
});

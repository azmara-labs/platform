import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { InputPrimitive, type InputPrimitiveProps } from "../../primitives/input.js";

export interface InputProps extends Omit<InputPrimitiveProps, "className"> {
  className?: string;
}

/**
 * A text input. `ref` is the real `<input>`, so `react-hook-form`'s `register()` works with
 * no `Controller`. Height and horizontal padding follow the density tokens. Native `onChange`
 * and the typed `onValueChange(value)` both fire.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <InputPrimitive
      ref={ref}
      type={type}
      className={cn(
        "flex h-(--density-control-height) w-full min-w-0 rounded-md border border-input bg-background px-(--density-control-padding-x) py-1 text-sm text-foreground",
        "transition-colors duration-(--motion-duration-fast) ease-standard",
        "outline-none placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-destructive data-[invalid]:border-destructive",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 read-only:bg-muted",
        className,
      )}
      {...props}
    />
  );
});

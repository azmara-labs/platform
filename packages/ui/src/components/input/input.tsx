import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import {
  Input as InputPrimitive,
  type InputProps as InputPrimitiveProps,
} from "../../primitives/input.js";
import { useDebouncedCallback } from "../../use-debounced.js";

type ValueChangeDetails = Parameters<NonNullable<InputPrimitiveProps["onValueChange"]>>[1];
type BlurEvent = Parameters<NonNullable<InputPrimitiveProps["onBlur"]>>[0];
type KeyDownEvent = Parameters<NonNullable<InputPrimitiveProps["onKeyDown"]>>[0];

export interface InputProps extends Omit<InputPrimitiveProps, "className"> {
  className?: string;
  /**
   * Waits this long after the last keystroke before calling `onValueChange`, for a search or an
   * autosave. The native `onChange` (and so `register()`) still fires on every keystroke.
   * `data-pending` is set while a call is waiting.
   */
  debounceMs?: number;
  /**
   * Called when the person is done with the value: on blur, or on Enter. It first sends any
   * waiting `onValueChange`. It is not called again for a value it has already reported.
   */
  onCommit?: (value: string) => void;
}

/**
 * A text input. `ref` is the real `<input>`, so `react-hook-form`'s `register()` works with
 * no `Controller`. Height and horizontal padding follow the density tokens. Native `onChange`
 * and the typed `onValueChange(value)` both fire; `debounceMs` and `onCommit` add the debounce
 * contract.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type = "text",
    debounceMs,
    onCommit,
    onValueChange,
    onBlur,
    onKeyDown,
    value,
    defaultValue,
    ...props
  },
  ref,
) {
  const initial = String(value ?? defaultValue ?? "");
  // The value as typed, and the last values reported, so nothing is reported twice.
  const current = useRef(initial);
  const emitted = useRef(initial);
  const committed = useRef(initial);
  if (value !== undefined) current.current = String(value);

  const [pending, setPending] = useState(false);
  const debounced = useDebouncedCallback(
    (next: string, details: ValueChangeDetails) => {
      if (next === emitted.current) return;
      emitted.current = next;
      onValueChange?.(next, details);
    },
    debounceMs ?? 0,
    { onPendingChange: setPending },
  );

  // The last value the person typed, to tell their edits from a value set from outside.
  const typed = useRef(initial);

  // A controlled value set from outside counts as reported and committed: only edits are.
  useEffect(() => {
    if (value === undefined) return;
    const next = String(value);
    if (next === typed.current) return;
    typed.current = next;
    emitted.current = next;
    committed.current = next;
  }, [value]);

  const commit = useCallback(() => {
    debounced.flush();
    if (current.current === committed.current) return;
    committed.current = current.current;
    onCommit?.(current.current);
  }, [debounced, onCommit]);

  function handleValueChange(next: string, details: ValueChangeDetails) {
    current.current = next;
    typed.current = next;
    if (debounceMs && debounceMs > 0) debounced(next, details);
    else {
      emitted.current = next;
      onValueChange?.(next, details);
    }
  }

  function handleBlur(event: BlurEvent) {
    commit();
    onBlur?.(event);
  }

  function handleKeyDown(event: KeyDownEvent) {
    // Not while an input method is composing: Enter there picks a candidate.
    if (event.key === "Enter" && !event.nativeEvent.isComposing) commit();
    onKeyDown?.(event);
  }

  return (
    <InputPrimitive
      ref={ref}
      type={type}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-pending={pending ? "" : undefined}
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

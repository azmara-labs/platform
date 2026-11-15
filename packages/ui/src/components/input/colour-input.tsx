import {
  type ChangeEvent,
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn.js";
import { Input, type InputProps } from "./input.js";

export interface ColourInputProps extends Omit<InputProps, "type" | "children"> {
  /**
   * The swatch's accessible name. The text field is named by its own label, for example a `Field`.
   * @default "Choose a colour"
   */
  swatchLabel?: string;
}

// The native picker always needs a value; `data-empty` dims the swatch when the text has no colour.
const EMPTY = "#808080"; // conventions-ignore: a placeholder value for the native picker, not a style
const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const LONG_HEX = /^#[0-9a-f]{6}$/i;

/** The swatch's value for some text: lower-case `#rrggbb` for `#rgb` and `#rrggbb`, else nothing. */
export function swatchValue(text: string): string | undefined {
  const trimmed = text.trim();
  const short = SHORT_HEX.exec(trimmed);
  if (short)
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  return LONG_HEX.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const setNativeValue = Object.getOwnPropertyDescriptor(
  typeof HTMLInputElement === "undefined" ? {} : HTMLInputElement.prototype,
  "value",
)?.set;

/**
 * A text field for a hex colour next to a native colour swatch. `ref` is the real text `<input>`,
 * so `register()` and `Field` work as they do for `Input`. Picking a colour writes a lower-case
 * `#rrggbb` into the text and reports it through `onChange` and `onValueChange`, like typing does.
 * It does not validate: pair it with a `Field` error, or `aria-invalid`. The swatch follows the
 * text when it is `#rgb` or `#rrggbb`; for anything else (empty, `oklch(...)`, a name) it carries
 * `data-empty`.
 */
export const ColourInput = forwardRef<HTMLInputElement, ColourInputProps>(function ColourInput(
  {
    swatchLabel = "Choose a colour",
    className,
    value,
    defaultValue,
    onChange,
    disabled,
    readOnly,
    autoComplete = "off",
    ...props
  },
  ref,
) {
  const element = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      element.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  // The text, for the swatch. Uncontrolled, the element is the source of truth: react-hook-form
  // writes defaultValues and reset() values to it without an event, so read it after every render
  // and follow it when it differs. It converges in one extra render.
  const [typed, setTyped] = useState(String(defaultValue ?? ""));
  const current = value === undefined ? typed : String(value);
  useEffect(() => {
    if (value === undefined && element.current && element.current.value !== typed) {
      setTyped(element.current.value);
    }
  });

  function handleChange(event: Parameters<NonNullable<InputProps["onChange"]>>[0]) {
    setTyped(event.target.value);
    onChange?.(event);
  }

  // Write the pick into the text input and let it report the change as if it were typed, so
  // onChange, onValueChange and register() all see it through one path.
  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const input = element.current;
    if (!input || !setNativeValue || disabled || readOnly) return;
    setNativeValue.call(input, event.target.value.toLowerCase());
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const colour = swatchValue(current);
  return (
    <div data-slot="colour-input" className={cn("flex w-full items-center gap-2", className)}>
      <input
        type="color"
        data-slot="colour-input-swatch"
        data-empty={colour === undefined ? "" : undefined}
        aria-label={swatchLabel}
        value={colour ?? EMPTY}
        onChange={handlePick}
        disabled={disabled || readOnly}
        className={cn(
          "h-(--density-control-height) w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1",
          "outline-none transition-colors duration-(--motion-duration-fast) ease-standard",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
          "data-[empty]:opacity-40 disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0",
          "[&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0",
        )}
      />
      <Input
        ref={setRefs}
        type="text"
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="off"
        {...props}
      />
    </div>
  );
});

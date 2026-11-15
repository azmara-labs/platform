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
  // and follow it when it differs. It converges in one extra render. The same read mirrors whether
  // the text input is disabled or read-only, which a surrounding `Field` can set without a prop.
  const [typed, setTyped] = useState(String(defaultValue ?? ""));
  const [locked, setLocked] = useState(false);
  const current = value === undefined ? typed : String(value);
  useEffect(() => {
    const input = element.current;
    if (!input) return;
    if (value === undefined && input.value !== typed) setTyped(input.value);
    if ((input.disabled || input.readOnly) !== locked) setLocked(input.disabled || input.readOnly);
  });

  // A form's native reset puts the text back without an event, and the browser does it after the
  // reset event, so read it on the next tick.
  useEffect(() => {
    const form = element.current?.form;
    if (!form || value !== undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onReset = () => {
      timer = setTimeout(() => {
        if (element.current) setTyped(element.current.value);
      }, 0);
    };
    form.addEventListener("reset", onReset);
    return () => {
      form.removeEventListener("reset", onReset);
      clearTimeout(timer);
    };
  }, [value]);

  function handleChange(event: Parameters<NonNullable<InputProps["onChange"]>>[0]) {
    setTyped(event.target.value);
    onChange?.(event);
  }

  // Write the pick into the text input and let it report the change as if it were typed, so
  // onChange, onValueChange and register() all see it through one path.
  const picked = useRef(false);
  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const input = element.current;
    if (!input || !setNativeValue || input.disabled || input.readOnly) return;
    setNativeValue.call(input, event.target.value.toLowerCase());
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picked.current = true;
  }

  // Leaving the swatch after a pick is the end of the edit, so the text input is blurred for
  // `onCommit` and for a form library that validates on blur. Tabbing through it changes nothing.
  function handleSwatchBlur() {
    const input = element.current;
    if (!picked.current || !input) return;
    picked.current = false;
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
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
        onBlur={handleSwatchBlur}
        disabled={disabled || readOnly || locked}
        className={cn(
          "h-(--density-control-height) w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1",
          "outline-none transition-colors duration-(--motion-duration-fast) ease-standard",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[empty]:[&::-webkit-color-swatch]:opacity-40 data-[empty]:[&::-moz-color-swatch]:opacity-40",
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

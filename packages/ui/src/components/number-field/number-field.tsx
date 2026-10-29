import {
  type AriaAttributes,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Minus, Plus } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { NumberField as NumberFieldPrimitive } from "../../primitives/number-field.js";
import { useLocale } from "../../react/LocaleProvider.js";
import { useDebouncedCallback } from "../../use-debounced.js";
import { useInputGroup } from "../input-group/context.js";

/** A handler a form library passes in, such as the `onChange` and `onBlur` from `register()`. */
export type FormEventHandler = (event: Event) => unknown;

export interface NumberFieldProps
  extends Pick<
    AriaAttributes,
    | "aria-label"
    | "aria-labelledby"
    | "aria-describedby"
    | "aria-required"
    | "aria-errormessage"
    | "aria-invalid"
  > {
  /** The number, or `null` when empty. Pass it with `onValueChange` for a controlled field. */
  value?: number | null;
  defaultValue?: number | null;
  /** The new number, or `null` when the field is emptied. Waits `debounceMs` when set. */
  onValueChange?: (value: number | null) => void;
  /**
   * Called when the person is done with the value: on blur, on Enter, or after a step with the
   * keyboard, the buttons or the wheel. Never twice for the same value.
   */
  onCommit?: (value: number | null) => void;
  /** Waits this long after the last keystroke before calling `onValueChange`. */
  debounceMs?: number;
  /** A string is accepted too, so `{...register()}` type-checks; it is read as a number. */
  min?: number | string;
  max?: number | string;
  /**
   * How much the arrow keys and the buttons change the value.
   * @default 1
   */
  step?: number;
  /**
   * Keeps the value between `min` and `max`: an out-of-range value is moved to the nearest limit
   * when the field is committed.
   * @default true
   */
  clamp?: boolean;
  /**
   * `false` stops negative numbers: the minus key does nothing and the value is clamped at 0.
   * @default true
   */
  allowNegative?: boolean;
  /** The most digits after the decimal point. Values are rounded to it when committed. */
  decimalScale?: number;
  /**
   * Thousands separators, such as `1,234,567`.
   * @default true
   */
  grouping?: boolean;
  /** Overrides the locale from `LocaleProvider` (en-NZ without one). */
  locale?: string;
  /** Further `Intl.NumberFormat` options, such as `{ style: "percent" }` or a `unit`. */
  format?: Intl.NumberFormatOptions;
  /** Shows − and + buttons either side of the input. */
  stepper?: boolean;
  /**
   * Lets the mouse wheel change the value while the field has focus. Off by default, so scrolling
   * the page past a focused field never changes it.
   * @default false
   */
  allowWheelScrub?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Styles the root element. */
  className?: string;
  /**
   * For form libraries: called with a real `change` event on the hidden form input once the new
   * number is in it, so React Hook Form's `register()` works without a `Controller`.
   */
  onChange?: FormEventHandler;
  /** For form libraries: called with a `blur` event on the hidden form input. */
  onBlur?: FormEventHandler;
  /** Labels for the stepper buttons. @default { decrement: "Decrease", increment: "Increase" } */
  stepperLabels?: { decrement: string; increment: string };
  /** Content before the input inside the border, such as a unit. Prefer `InputGroup` for more. */
  children?: ReactNode;
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * `setValueAs` for React Hook Form: the hidden input's text as a number, or `null` when empty.
 * `register("amount", { setValueAs: numberOrNull })`.
 */
export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isNaN(number) ? null : number;
}

interface BaseProps extends NumberFieldProps {
  formatOptions: Intl.NumberFormatOptions;
  inputClassName?: string;
}

const DEFAULT_STEPPER_LABELS = { decrement: "Decrease", increment: "Increase" };

/** The shared engine behind `NumberField` and `MoneyField`. */
export const NumberFieldBase = forwardRef<HTMLInputElement, BaseProps>(function NumberFieldBase(
  {
    value,
    defaultValue,
    onValueChange,
    onCommit,
    debounceMs,
    min: minProp,
    max: maxProp,
    step = 1,
    clamp = true,
    allowNegative = true,
    decimalScale,
    locale: localeProp,
    formatOptions,
    stepper = false,
    allowWheelScrub = false,
    name,
    id,
    placeholder,
    disabled,
    readOnly,
    required,
    className,
    inputClassName,
    onChange,
    onBlur,
    stepperLabels = DEFAULT_STEPPER_LABELS,
    children,
    "aria-describedby": describedBy,
    ...aria
  },
  ref,
) {
  const localeContext = useLocale();
  const locale = localeProp ?? localeContext.locale;
  const group = useInputGroup();
  const toNumber = (limit: number | string | undefined) =>
    limit === undefined || limit === "" ? undefined : Number(limit);
  const max = toNumber(maxProp);
  const min = allowNegative ? toNumber(minProp) : Math.max(toNumber(minProp) ?? 0, 0);

  const [inner, setInner] = useState<number | null>(value ?? defaultValue ?? null);
  const number = value !== undefined ? value : inner;
  const current = useRef(number);
  current.current = number;
  const emitted = useRef(number);
  const committed = useRef(number);

  const hidden = useRef<HTMLInputElement | null>(null);
  const setHiddenRef = useCallback(
    (node: HTMLInputElement | null) => {
      hidden.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  // Form library handlers listen on the hidden input, the one with the `name`, as they would on a
  // native input. They get real DOM events.
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  const latestBlur = useRef(onBlur);
  latestBlur.current = onBlur;
  useEffect(() => {
    const node = hidden.current;
    if (!node) return;
    const change = (event: Event) => latestChange.current?.(event);
    const blur = (event: Event) => latestBlur.current?.(event);
    node.addEventListener("change", change);
    node.addEventListener("blur", blur);
    return () => {
      node.removeEventListener("change", change);
      node.removeEventListener("blur", blur);
    };
  }, []);

  // React Hook Form writes `defaultValues` straight into the hidden input when it registers it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the DOM once, on mount
  useEffect(() => {
    const node = hidden.current;
    if (value !== undefined || inner !== null || !node || node.value === "") return;
    const read = numberOrNull(node.value);
    if (read === null) return;
    current.current = read;
    emitted.current = read;
    committed.current = read;
    setInner(read);
  }, []);

  // Tell form libraries about a new number once it has rendered into the hidden input.
  const announce = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each new number renders
  useEffect(() => {
    if (!announce.current) return;
    announce.current = false;
    hidden.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [number]);

  const [pending, setPending] = useState(false);
  const debounced = useDebouncedCallback(
    (next: number | null) => {
      if (Object.is(next, emitted.current)) return;
      emitted.current = next;
      onValueChange?.(next);
    },
    debounceMs ?? 0,
    { onPendingChange: setPending },
  );

  // A controlled value set from outside counts as reported and committed, and replaces a waiting
  // edit, which is dropped. (Base UI keeps the typed text itself, so no draft is needed here.)
  useEffect(() => {
    if (value === undefined || Object.is(value, emitted.current)) return;
    emitted.current = value;
    committed.current = value;
    debounced.cancel();
  }, [value, debounced]);

  const update = useCallback(
    (next: number | null) => {
      current.current = next;
      announce.current = true;
      if (value === undefined) setInner(next);
      if (debounceMs && debounceMs > 0) debounced(next);
      else if (!Object.is(next, emitted.current)) {
        emitted.current = next;
        onValueChange?.(next);
      }
    },
    [value, debounceMs, debounced, onValueChange],
  );

  const commit = useCallback(
    (next: number | null) => {
      debounced.flush();
      if (Object.is(next, committed.current)) return;
      committed.current = next;
      onCommit?.(next);
    },
    [debounced, onCommit],
  );

  const ids = [group?.describedBy, describedBy].filter(Boolean).join(" ");
  const groupAria = group
    ? {
        ...(group["aria-required"] !== undefined && { "aria-required": group["aria-required"] }),
        ...(group["aria-errormessage"] !== undefined && {
          "aria-errormessage": group["aria-errormessage"],
        }),
      }
    : {};

  const buttonClass = cn(
    "flex h-full w-(--density-control-height) shrink-0 items-center justify-center text-muted-foreground",
    "outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  );

  return (
    <NumberFieldPrimitive.Root
      inputRef={setHiddenRef}
      value={number}
      onValueChange={(next) => update(next)}
      onValueCommitted={(next) => commit(next)}
      min={min}
      max={max}
      step={step}
      allowOutOfRange={!clamp}
      locale={locale}
      format={formatOptions}
      allowWheelScrub={allowWheelScrub}
      name={name}
      id={id}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className={cn(group ? "flex h-full min-w-0 flex-1" : "w-full min-w-0", className)}
    >
      <NumberFieldPrimitive.Group
        className={cn(
          "flex h-full w-full min-w-0 items-center text-sm text-foreground",
          !group && [
            "h-(--density-control-height) rounded-md border border-input bg-background",
            "transition-colors duration-(--motion-duration-fast) ease-standard",
            "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring",
            "has-[input[aria-invalid=true]]:border-destructive has-[input[data-invalid]]:border-destructive",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[readonly]:bg-muted",
          ],
        )}
      >
        {stepper ? (
          <NumberFieldPrimitive.Decrement
            aria-label={stepperLabels.decrement}
            className={cn(buttonClass, "rounded-s-md border-e border-input")}
          >
            <Icon icon={Minus} size="xs" />
          </NumberFieldPrimitive.Decrement>
        ) : null}
        {children}
        <NumberFieldPrimitive.Input
          {...aria}
          {...groupAria}
          aria-describedby={ids || undefined}
          placeholder={placeholder}
          data-pending={pending ? "" : undefined}
          onKeyDown={(event) => {
            // Base UI has already clamped and rounded the stored number as it was typed.
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            commit(current.current);
          }}
          onBlur={() => {
            // After Base UI has clamped and formatted on blur.
            queueMicrotask(() => {
              hidden.current?.dispatchEvent(new FocusEvent("blur"));
            });
          }}
          className={cn(
            "h-full w-full min-w-0 flex-1 bg-transparent px-(--density-control-padding-x) tabular-nums outline-none",
            "placeholder:text-muted-foreground",
            group &&
              "px-2 first:ps-(--density-control-padding-x) last:pe-(--density-control-padding-x)",
            inputClassName,
          )}
        />
        {stepper ? (
          <NumberFieldPrimitive.Increment
            aria-label={stepperLabels.increment}
            className={cn(buttonClass, "rounded-e-md border-s border-input")}
          >
            <Icon icon={Plus} size="xs" />
          </NumberFieldPrimitive.Increment>
        ) : null}
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
});

/**
 * A number input. Formats with `Intl.NumberFormat` for the locale (grouping, decimals, percent,
 * units), and reports a real `number` (or `null` when empty), never a formatted string.
 * `min`, `max` and `step` work with the arrow keys and the optional stepper buttons, and the value
 * is clamped when committed. The mouse wheel only changes it when `allowWheelScrub` is set.
 * `register()` from React Hook Form works without a `Controller`: use
 * `{ setValueAs: numberOrNull }`.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { decimalScale, grouping = true, format, ...props },
  ref,
) {
  const formatOptions = useMemo<Intl.NumberFormatOptions>(
    () => ({
      useGrouping: grouping,
      ...(decimalScale !== undefined && { maximumFractionDigits: decimalScale }),
      ...format,
    }),
    [grouping, decimalScale, format],
  );
  return (
    <NumberFieldBase
      ref={ref}
      decimalScale={decimalScale}
      formatOptions={formatOptions}
      {...props}
    />
  );
});

export interface MoneyFieldProps extends NumberFieldProps {
  /** An ISO 4217 code. Defaults to the `LocaleProvider` currency (NZD without one). */
  currency?: string;
  /**
   * How the currency shows: `"symbol"` ($), `"narrowSymbol"`, `"code"` (NZD) or `"name"`.
   * @default "symbol"
   */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
}

/**
 * A money input: a `NumberField` formatted as currency for the locale, such as `$1,234.50` for
 * NZD in en-NZ. Amounts are rounded to the currency's minor unit (2 for NZD, 0 for JPY) unless
 * `decimalScale` says otherwise. Reports a plain number in the currency's major unit.
 */
export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  {
    currency: currencyProp,
    currencyDisplay = "symbol",
    decimalScale,
    grouping = true,
    format,
    locale,
    ...props
  },
  ref,
) {
  const localeContext = useLocale();
  const currency = currencyProp ?? localeContext.currency;
  const resolvedLocale = locale ?? localeContext.locale;
  const formatOptions = useMemo<Intl.NumberFormatOptions>(() => {
    const digits =
      decimalScale ??
      new Intl.NumberFormat(resolvedLocale, { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits;
    return {
      style: "currency",
      currency,
      currencyDisplay,
      useGrouping: grouping,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      ...format,
    };
  }, [currency, currencyDisplay, decimalScale, grouping, format, resolvedLocale]);
  return (
    <NumberFieldBase
      ref={ref}
      locale={locale}
      decimalScale={decimalScale}
      formatOptions={formatOptions}
      {...props}
    />
  );
});

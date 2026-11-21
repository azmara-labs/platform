import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "../../lib/cn.js";
import { Fieldset as FieldsetPrimitive } from "../../primitives/fieldset.js";
import { FieldDescription, FieldError, FieldRoot } from "../field/field.js";
import { hasError, RequiredMark } from "./row.js";
import type { ChoiceOption, ChoiceSize } from "./types.js";

const ChoiceSizeContext = createContext<ChoiceSize | undefined>(undefined);

/** An item's own size, else its group's, else `md`. */
export function useChoiceSize(own?: ChoiceSize): ChoiceSize {
  const group = useContext(ChoiceSizeContext);
  return own ?? group ?? "md";
}

/** What the shell computes for the group element it renders. */
export interface GroupWiring {
  /** Ids of the description and the error, space separated. */
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

export interface ChoiceGroupShellProps {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  size?: ChoiceSize;
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Builds the Base UI group (`RadioGroup`, `CheckboxGroup`) that the fieldset is rendered as. */
  group: (wiring: GroupWiring) => ReactElement;
  children: ReactNode;
}

/**
 * The frame around a group of choices, following Base UI's own pattern: a `Field` holding a
 * `Fieldset` that is rendered AS the group, with the label in its `Legend` (so the legend names the
 * group), then the description, the items, and the error in a polite live region. The items get
 * the group's `size`.
 */
export function ChoiceGroupShell({
  label,
  description,
  error,
  required,
  size,
  orientation = "vertical",
  className,
  group,
  children,
}: ChoiceGroupShellProps) {
  const descriptionId = useId();
  const errorId = useId();
  const showError = hasError(error);
  const describedBy =
    [description !== undefined ? descriptionId : undefined, showError ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <ChoiceSizeContext.Provider value={size}>
      <FieldRoot invalid={showError} className={cn("gap-0", className)}>
        <FieldsetPrimitive.Root
          render={group({ describedBy, invalid: showError, required: Boolean(required) })}
        >
          {label !== undefined ? (
            <FieldsetPrimitive.Legend className="mb-1.5 text-sm font-medium leading-none text-foreground">
              {label}
              {required ? <RequiredMark /> : null}
            </FieldsetPrimitive.Legend>
          ) : null}
          {description !== undefined ? (
            <FieldDescription id={descriptionId} className="mb-1.5">
              {description}
            </FieldDescription>
          ) : null}
          <div
            className={cn(
              "flex",
              orientation === "horizontal"
                ? "flex-row flex-wrap gap-x-6 gap-y-1"
                : "flex-col gap-1",
            )}
          >
            {children}
          </div>
          <div aria-live="polite" className="empty:hidden">
            {showError ? (
              <FieldError id={errorId} match className="mt-1.5 font-medium text-destructive">
                {error}
              </FieldError>
            ) : null}
          </div>
        </FieldsetPrimitive.Root>
      </FieldRoot>
    </ChoiceSizeContext.Provider>
  );
}

/** Pairs each option with a React key that stays unique even when two options share a value. */
export function withUniqueKeys(
  options: readonly ChoiceOption[],
): [key: string, option: ChoiceOption][] {
  const seen = new Map<string, number>();
  return options.map((option) => {
    const count = seen.get(option.value) ?? 0;
    seen.set(option.value, count + 1);
    return [`${option.value}\u0000${count}`, option];
  });
}

/** Warns once, in development, when two options share a value: they would select together. */
export function useWarnDuplicateValues(options: readonly ChoiceOption[] | undefined, who: string) {
  const warned = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || warned.current || !options) return;
    const seen = new Set<string>();
    for (const option of options) {
      if (seen.has(option.value)) {
        warned.current = true;
        console.warn(
          `${who}: two options share the value ${JSON.stringify(option.value)}; give each its own.`,
        );
        return;
      }
      seen.add(option.value);
    }
  }, [options, who]);
}

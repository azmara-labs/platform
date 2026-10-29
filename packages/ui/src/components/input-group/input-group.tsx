import {
  type AriaAttributes,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { cn } from "../../lib/cn.js";
import { Button, type ButtonProps } from "../button/button.js";
import { Input, type InputProps } from "../input/input.js";

import { type ForwardedAria, InputGroupContext, type InputGroupContextValue } from "./context.js";

export interface InputGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  className?: string;
  /** An `InputGroupInput` with `InputGroupAddon`s and `InputGroupButton`s before or after it. */
  children: ReactNode;
}

const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [tabindex]";

/**
 * Puts text, icons and buttons inside an input's border: a currency or unit ("NZ$", "kg"), a
 * search icon, or a clear, copy or show-password button. The border and focus ring wrap the whole
 * group. Inside a `Field`, the aria attributes `Field` sets (`aria-required`, `aria-errormessage`)
 * are passed on to the input, so the wiring is the same as for a bare `Input`.
 */
export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  {
    className,
    children,
    onMouseDown,
    "aria-required": ariaRequired,
    "aria-errormessage": ariaErrorMessage,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const [ids, setIds] = useState<string[]>([]);
  const register = useCallback((id: string) => {
    // In document order, so an addon rendered later (a conditional one) is still read in the
    // order people see it.
    setIds((current) =>
      [...current, id].sort((a, b) => {
        const first = document.getElementById(a);
        const second = document.getElementById(b);
        if (!first || !second) return 0;
        return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      }),
    );
    return () => setIds((current) => current.filter((existing) => existing !== id));
  }, []);
  const value = useMemo<InputGroupContextValue>(
    () => ({
      describedBy: ids.length > 0 ? ids.join(" ") : undefined,
      register,
      "aria-required": ariaRequired,
      "aria-errormessage": ariaErrorMessage,
      "aria-invalid": ariaInvalid,
    }),
    [ids, register, ariaRequired, ariaErrorMessage, ariaInvalid],
  );

  // A press on an addon or the padding focuses the input, as a press on a label would.
  function focusInput(event: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    const input = event.currentTarget.querySelector<HTMLInputElement>("input");
    if (!input || input.disabled) return;
    event.preventDefault();
    input.focus();
  }

  return (
    <InputGroupContext.Provider value={value}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut like a label's; keyboard users tab to the input itself */}
      <div
        ref={ref}
        data-slot="input-group"
        onMouseDown={focusInput}
        className={cn(
          "flex h-(--density-control-height) w-full min-w-0 items-center rounded-md border border-input bg-background text-sm text-foreground",
          "transition-colors duration-(--motion-duration-fast) ease-standard",
          "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring",
          "has-[input[aria-invalid=true]]:border-destructive has-[input[data-invalid]]:border-destructive",
          "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50 has-[input:read-only]:bg-muted",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </InputGroupContext.Provider>
  );
});

/**
 * The input inside an `InputGroup`. `ref` is the real `<input>`, so `register()` works with no
 * `Controller`. Text addons are added to its `aria-describedby`, ahead of any field description.
 */
export const InputGroupInput = forwardRef<HTMLInputElement, InputProps>(function InputGroupInput(
  { className, "aria-describedby": describedBy, ...props },
  ref,
) {
  const group = useContext(InputGroupContext);
  const ids = [group?.describedBy, describedBy].filter(Boolean).join(" ");
  // Only the attributes that are set: an explicit `undefined` would replace the ones Base UI's
  // Field gives the control.
  const aria: ForwardedAria & Pick<AriaAttributes, "aria-describedby"> = {};
  if (group?.["aria-required"] !== undefined) aria["aria-required"] = group["aria-required"];
  if (group?.["aria-errormessage"] !== undefined) {
    aria["aria-errormessage"] = group["aria-errormessage"];
  }
  if (group?.["aria-invalid"] !== undefined) aria["aria-invalid"] = group["aria-invalid"];
  if (ids) aria["aria-describedby"] = ids;
  return (
    <Input
      ref={ref}
      {...aria}
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent px-2 read-only:bg-transparent",
        "first:ps-(--density-control-padding-x) last:pe-(--density-control-padding-x)",
        "focus-visible:ring-0",
        // The browser's own clear button would sit beside an InputGroupButton that clears.
        "[&::-webkit-search-cancel-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
});

export interface InputGroupAddonProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  className?: string;
  /**
   * Adds the addon's text to the input's accessible description, for text that carries meaning,
   * such as "NZD" or "kg". When `false`, the addon is hidden from screen readers, as an icon
   * should be. Defaults to `true` for plain text and `false` for anything else.
   */
  describe?: boolean;
}

/** Text or an icon before or after the input. It is not part of the input's value. */
export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  function InputGroupAddon({ className, describe, children, id, ...props }, ref) {
    const group = useContext(InputGroupContext);
    const ownId = useId();
    const addonId = id ?? ownId;
    const describes = describe ?? (typeof children === "string" || typeof children === "number");
    const register = group?.register;

    useEffect(() => {
      if (!describes || !register) return;
      return register(addonId);
    }, [describes, register, addonId]);

    return (
      <div
        ref={ref}
        id={addonId}
        aria-hidden={describes ? undefined : true}
        data-slot="input-group-addon"
        className={cn(
          "flex h-full shrink-0 select-none items-center gap-1.5 px-2 text-muted-foreground",
          "first:ps-(--density-control-padding-x) last:pe-(--density-control-padding-x)",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

/**
 * A button inside an `InputGroup`, such as clear, copy or show password. It is a plain
 * `type="button"`, so it never submits the form, and it stays in the tab order after the input.
 */
export type InputGroupButtonProps = ButtonProps;

export const InputGroupButton: ForwardRefExoticComponent<
  InputGroupButtonProps & RefAttributes<HTMLButtonElement>
> = forwardRef<HTMLButtonElement, InputGroupButtonProps>(function InputGroupButton(
  { className, variant = "ghost", size = "sm", type = "button", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      type={type}
      className={cn(
        "h-[calc(100%-0.5rem)] shrink-0 rounded-sm px-2 first:ms-1 last:me-1",
        size === "icon" && "aspect-square w-auto",
        className,
      )}
      {...({ size, ...props } as ButtonProps)}
    />
  );
});

import type { VariantProps } from "class-variance-authority";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "../../primitives/button.js";
import { Spinner } from "../spinner/spinner.js";
import { buttonVariants } from "./variants.js";

export { buttonVariants };

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type TextButtonSize = "sm" | "md" | "lg";

/**
 * The props `Button` adds on top of a native button. Kept as its own interface so the docs can
 * generate a props table from it. Everything else a button accepts (`onClick`, `type`, `disabled`,
 * `render`, `nativeButton`, `focusableWhenDisabled`, any `aria-*`, ...) is passed through.
 */
export interface ButtonOwnProps {
  /** Visual style. `default` is the primary action; use `destructive` for irreversible ones. */
  variant?: ButtonVariant;
  /**
   * `md` follows the density token, so it grows or shrinks with `data-density`. `icon` is a square
   * button for an icon alone and requires `aria-label` or `aria-labelledby`.
   */
  size?: "sm" | "md" | "lg" | "icon";
  /** Show a spinner, mark the button busy and ignore activation. It stays focusable. */
  loading?: boolean;
  /** Replaces the label while `loading`. */
  loadingText?: ReactNode;
  /** Shown before the label; replaced by the spinner while `loading`. */
  startIcon?: ReactNode;
  /** Shown after the label. */
  endIcon?: ReactNode;
}

interface BaseButtonProps
  extends Omit<ButtonPrimitiveProps, "className" | "children">,
    Omit<ButtonOwnProps, "size"> {
  className?: string;
  children?: ReactNode;
}

/** An icon-only button has no text, so it must be given an accessible name. */
type IconOnly = { size: "icon" } & ({ "aria-label": string } | { "aria-labelledby": string });

export type ButtonProps = BaseButtonProps & ({ size?: TextButtonSize } | IconOnly);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    className,
    loading = false,
    loadingText,
    startIcon,
    endIcon,
    disabled,
    focusableWhenDisabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <ButtonPrimitive
      ref={ref}
      // A loading button is "disabled" for activation but stays in the tab order.
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Spinner /> : startIcon}
      {loading && loadingText !== undefined ? loadingText : children}
      {endIcon}
    </ButtonPrimitive>
  );
});

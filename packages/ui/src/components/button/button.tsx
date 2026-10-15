import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { ButtonPrimitive, type ButtonPrimitiveProps } from "../../primitives/button.js";
import { Spinner } from "../spinner/spinner.js";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "h-(--density-control-height) px-(--density-control-padding-x)",
    "transition-colors duration-(--motion-duration-fast) ease-standard",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "",
        lg: "h-11 px-6",
        icon: "size-(--density-control-height) p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

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

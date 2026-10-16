import { forwardRef, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import type { ButtonProps as ButtonPrimitiveProps } from "../../primitives/button.js";
import { Button, type ButtonOwnProps } from "./button.js";

const SQUARE = { sm: "size-8", md: "", lg: "size-11" } as const;

export interface IconButtonProps
  extends Omit<ButtonPrimitiveProps, "className" | "children" | "aria-label" | "aria-labelledby"> {
  /**
   * The icon, as an element: `<Icon icon={Plus} />`. An element, not a component, so the button can be
   * used from a Server Component (a function cannot be passed across that boundary).
   */
  icon: ReactNode;
  /**
   * What the button does, as text: "Add item", "Close". It is the accessible name, and it is
   * required because an icon alone cannot be announced.
   */
  label: string;
  /** Default `ghost`, so a row of icon buttons is quiet. */
  variant?: ButtonOwnProps["variant"];
  /** A square size. `md` follows the density token. Default `md`. */
  size?: keyof typeof SQUARE;
  /** Replace the icon with a spinner, mark the button busy and ignore activation. It stays focusable. */
  loading?: boolean;
  className?: string;
}

/** A square button with only an icon. The label is required and becomes its `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", size = "md", loading = false, className, ...props },
  ref,
) {
  if (process.env.NODE_ENV !== "production" && !label.trim()) {
    throw new Error(
      "IconButton: `label` must be a non-empty string; it is the button's accessible name.",
    );
  }
  return (
    <Button
      ref={ref}
      size="icon"
      variant={variant}
      aria-label={label}
      loading={loading}
      className={cn(SQUARE[size], className)}
      {...props}
    >
      {/* Button shows its own spinner while loading, so the icon steps aside. */}
      {loading ? null : icon}
    </Button>
  );
});

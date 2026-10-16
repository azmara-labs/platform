import { ChevronDown } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import type { ButtonProps as ButtonPrimitiveProps } from "../../primitives/button.js";
import { Button, type ButtonOwnProps } from "../button/button.js";
import { joinedClasses } from "../button/button-group.js";
import { IconButton } from "../button/icon-button.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../menu/index.js";

export interface SplitButtonProps
  extends Omit<
    ButtonPrimitiveProps,
    "className" | "children" | "type" | "render" | "nativeButton"
  > {
  /** The primary action's label. */
  children: ReactNode;
  /** The extra actions: `DropdownMenuItem`s (and groups, separators, and so on). */
  menu: ReactNode;
  /** Names the arrow button ("More save options"). Required: the arrow has no text. */
  menuLabel: string;
  variant?: ButtonOwnProps["variant"];
  size?: "sm" | "md" | "lg";
  /** Shows a spinner on the primary button and ignores it. The menu stays usable. */
  loading?: boolean;
  loadingText?: ReactNode;
  startIcon?: ReactNode;
  className?: string;
}

/**
 * A primary action with a menu of related ones attached: "Save", and a menu with "Save as…".
 *
 * Keyboard: Tab visits the primary button, then the arrow button; Enter or Space on the primary
 * runs it; ArrowDown, Enter or Space on the arrow opens the menu (see `DropdownMenu` for the keys
 * inside it), and Escape closes it and returns focus to the arrow.
 */
export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(function SplitButton(
  { children, menu, menuLabel, variant = "default", size = "md", disabled, className, ...props },
  ref,
) {
  return (
    <div className={cn(joinedClasses("horizontal", true), className)}>
      <Button ref={ref} variant={variant} size={size} disabled={disabled} {...props}>
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <IconButton
              icon={<Icon icon={ChevronDown} />}
              label={menuLabel}
              variant={variant}
              size={size}
              // Filled variants need a divider between the two halves; outline already has a border.
              className={cn(variant !== "outline" && "border-l border-l-background/30")}
            />
          }
        />
        <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

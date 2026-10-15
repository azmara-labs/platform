import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Menu as MenuPrimitive } from "../../primitives/menu.js";
import { POSITION_DEFAULTS, type PositionProps } from "../floating/shared.js";
import { MENU_POPUP, MENU_POSITIONER } from "./parts.js";

/**
 * A menu of actions opened from a button.
 *
 * Keyboard: Enter, Space or ArrowDown on the trigger opens it on the first item (ArrowUp, on the
 * last). Inside, ArrowDown and ArrowUp move between items and wrap, Home and End jump, typing
 * letters jumps to the item that starts with them, Enter or Space runs the item, ArrowRight opens
 * a submenu and ArrowLeft closes it, Escape closes (one level at a time) and returns focus to the
 * trigger, and Tab closes it. Disabled items stay focusable (so they can be found) but cannot be run.
 */
export const DropdownMenu = MenuPrimitive.Root;

export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export type DropdownMenuContentProps = Omit<
  ComponentPropsWithoutRef<typeof MenuPrimitive.Popup>,
  "className"
> &
  PositionProps & { className?: string };

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent(
    {
      side = "bottom",
      align = "start",
      sideOffset = POSITION_DEFAULTS.sideOffset - 2,
      collisionPadding = POSITION_DEFAULTS.collisionPadding,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={MENU_POSITIONER}
        >
          <MenuPrimitive.Popup ref={ref} className={cn(MENU_POPUP, className)} {...props} />
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    );
  },
);

export {
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuGroup as DropdownMenuGroup,
  MenuItem as DropdownMenuItem,
  MenuLabel as DropdownMenuLabel,
  MenuLinkItem as DropdownMenuLinkItem,
  MenuRadioGroup as DropdownMenuRadioGroup,
  MenuRadioItem as DropdownMenuRadioItem,
  MenuSeparator as DropdownMenuSeparator,
  MenuShortcut as DropdownMenuShortcut,
  MenuSub as DropdownMenuSub,
  MenuSubContent as DropdownMenuSubContent,
  MenuSubTrigger as DropdownMenuSubTrigger,
} from "./parts.js";

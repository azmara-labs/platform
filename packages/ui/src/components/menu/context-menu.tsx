import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { ContextMenu as ContextMenuPrimitive } from "../../primitives/context-menu.js";
import { POSITION_DEFAULTS, type PositionProps } from "../floating/shared.js";
import { MENU_POPUP, MENU_POSITIONER } from "./parts.js";

/**
 * A menu that opens at the pointer on right click (or long press on touch). It supports the same
 * keys as `DropdownMenu` once it is open.
 *
 * Use it as an enhancement only. The trigger area is not focusable and a long press is easy to
 * miss, so every action in it must also be reachable another way, for example a visible actions
 * button that opens a `DropdownMenu` with the same items.
 */
export const ContextMenu = ContextMenuPrimitive.Root;

/** The area that responds to right click. Give it a size with `className`. */
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export type ContextMenuContentProps = Omit<
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Popup>,
  "className"
> &
  PositionProps & { className?: string };

export const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  function ContextMenuContent(
    {
      side,
      align,
      sideOffset,
      collisionPadding = POSITION_DEFAULTS.collisionPadding,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={MENU_POSITIONER}
        >
          <ContextMenuPrimitive.Popup ref={ref} className={cn(MENU_POPUP, className)} {...props} />
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    );
  },
);

export {
  MenuCheckboxItem as ContextMenuCheckboxItem,
  MenuGroup as ContextMenuGroup,
  MenuItem as ContextMenuItem,
  MenuLabel as ContextMenuLabel,
  MenuLinkItem as ContextMenuLinkItem,
  MenuRadioGroup as ContextMenuRadioGroup,
  MenuRadioItem as ContextMenuRadioItem,
  MenuSeparator as ContextMenuSeparator,
  MenuShortcut as ContextMenuShortcut,
  MenuSub as ContextMenuSub,
  MenuSubContent as ContextMenuSubContent,
  MenuSubTrigger as ContextMenuSubTrigger,
} from "./parts.js";

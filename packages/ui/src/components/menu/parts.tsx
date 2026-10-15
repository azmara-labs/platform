import { Check, ChevronRight, Circle } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef, type HTMLAttributes } from "react";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Menu as MenuPrimitive } from "../../primitives/menu.js";
import { FLOATING_MOTION, POSITION_DEFAULTS, type PositionProps } from "../floating/shared.js";

type WithClassName<T> = Omit<T, "className"> & { className?: string };

/**
 * The surface of every menu. It sits on the popover layer, not the dropdown layer: a menu opened
 * from inside a dialog must appear above it.
 */
export const MENU_POSITIONER = "z-(--z-popover)";
export const MENU_POPUP = cn(
  "min-w-40 max-h-(--available-height) overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-elevation-3 outline-none",
  FLOATING_MOTION,
);

const ITEM = cn(
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-(--motion-duration-fast)",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
);
const CHECKABLE = "pl-8";
const INDICATOR = "absolute left-2 flex size-4 items-center justify-center";
const DESTRUCTIVE =
  "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive";

export interface MenuItemProps
  extends WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Item>> {
  /** `destructive` for an item that deletes or discards something. */
  variant?: "default" | "destructive";
}

/** An action. Arrow keys move between items; Enter or Space runs it and closes the menu. */
export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { variant = "default", className, ...props },
  ref,
) {
  return (
    <MenuPrimitive.Item
      ref={ref}
      className={cn(ITEM, variant === "destructive" && DESTRUCTIVE, className)}
      {...props}
    />
  );
});

/** A link in a menu. Renders an `<a>`, so it works with middle click and "open in new tab". */
export const MenuLinkItem = forwardRef<
  HTMLAnchorElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.LinkItem>>
>(function MenuLinkItem({ className, ...props }, ref) {
  return <MenuPrimitive.LinkItem ref={ref} className={cn(ITEM, className)} {...props} />;
});

/** An item that toggles on and off. It stays open when toggled; set `closeOnClick` to change that. */
export const MenuCheckboxItem = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>>
>(function MenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.CheckboxItem ref={ref} className={cn(ITEM, CHECKABLE, className)} {...props}>
      <MenuPrimitive.CheckboxItemIndicator className={INDICATOR}>
        <Icon icon={Check} />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
});

/** A group of radio items: exactly one is selected. */
export const MenuRadioGroup = MenuPrimitive.RadioGroup;

export const MenuRadioItem = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>>
>(function MenuRadioItem({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.RadioItem ref={ref} className={cn(ITEM, CHECKABLE, className)} {...props}>
      <MenuPrimitive.RadioItemIndicator className={INDICATOR}>
        <Icon icon={Circle} size="xs" className="fill-current" />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
});

/** Groups items under a label, announced as a named group. */
export const MenuGroup = MenuPrimitive.Group;

export const MenuLabel = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.GroupLabel>>
>(function MenuLabel({ className, ...props }, ref) {
  return (
    <MenuPrimitive.GroupLabel
      ref={ref}
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
});

export const MenuSeparator = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>>
>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
});

/**
 * A keyboard shortcut shown at the end of an item. It is a hint only: wiring the shortcut up is
 * the app's job. Add `aria-keyshortcuts` to the item if it is real.
 */
export function MenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-azmr-shortcut=""
      className={cn("ml-auto pl-4 text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Wraps a nested menu: a `MenuSubTrigger` and its `MenuSubContent`. */
export const MenuSub = MenuPrimitive.SubmenuRoot;

export const MenuSubTrigger = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.SubmenuTrigger>>
>(function MenuSubTrigger({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.SubmenuTrigger
      ref={ref}
      className={cn(ITEM, "data-[popup-open]:bg-accent", className)}
      {...props}
    >
      {children}
      <Icon icon={ChevronRight} className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
});

export type MenuSubContentProps = WithClassName<
  ComponentPropsWithoutRef<typeof MenuPrimitive.Popup>
> &
  PositionProps;

export const MenuSubContent = forwardRef<HTMLDivElement, MenuSubContentProps>(
  function MenuSubContent(
    {
      side = "inline-end",
      align = "start",
      sideOffset = 2,
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

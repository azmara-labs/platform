import { cva } from "class-variance-authority";
import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from "react";
import { cn } from "../../lib/cn.js";
import { Toggle as TogglePrimitive } from "../../primitives/toggle.js";
import { ToggleGroup as ToggleGroupPrimitive } from "../../primitives/toggle-group.js";
import { joinedClasses } from "../button/button-group.js";

type Variant = "default" | "outline";
type TextSize = "sm" | "md" | "lg";
type Named = { "aria-label": string } | { "aria-labelledby": string };

export const toggleVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors duration-(--motion-duration-fast) ease-standard",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "hover:bg-muted hover:text-muted-foreground",
    "data-[pressed]:bg-accent data-[pressed]:text-accent-foreground",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-(--density-control-height) px-3",
        lg: "h-11 px-5",
        icon: "size-(--density-control-height) p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

interface ToggleOwnProps {
  /** `outline` draws a border. Default `default`. */
  variant?: Variant;
  className?: string;
}

/** An icon-only toggle has no text, so it must be given an accessible name. */
type IconOnly = { size: "icon" } & Named;

type ToggleBase = Omit<ComponentPropsWithoutRef<typeof TogglePrimitive>, "className"> &
  ToggleOwnProps;

export type ToggleProps = ToggleBase & ({ size?: TextSize } | IconOnly);

/** A button that stays pressed. It reports its state as `aria-pressed`. */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { variant, size, className, ...props },
  ref,
) {
  return (
    <TogglePrimitive
      ref={ref}
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
});

const GroupContext = createContext<{ variant?: Variant; size?: TextSize | "icon" }>({});

export type ToggleGroupProps = Omit<
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive>,
  "className" | "aria-label" | "aria-labelledby"
> &
  Named & {
    /** Applied to every item unless it sets its own. */
    variant?: Variant;
    size?: TextSize | "icon";
    /** Join the items into one control (default), or keep them apart with a gap. */
    attached?: boolean;
    className?: string;
  };

/**
 * A group of toggles that behaves as one control. By default one item can be pressed at a time
 * (pressing it again releases it); with `multiple`, any number can. The value is an array of the
 * pressed items' `value`s either way.
 *
 * Keyboard: Tab enters the group at one stop; the arrow keys (Left and Right, or Up and Down when
 * vertical) move focus between items and wrap; Home and End jump; Space or Enter presses the
 * focused item. Moving focus never changes the selection.
 */
export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(function ToggleGroup(
  { variant, size, attached = true, orientation = "horizontal", className, ...props },
  ref,
) {
  return (
    <GroupContext.Provider value={{ variant, size }}>
      <ToggleGroupPrimitive
        ref={ref}
        orientation={orientation}
        className={cn(joinedClasses(orientation, attached), className)}
        {...props}
      />
    </GroupContext.Provider>
  );
});

export type ToggleGroupItemProps = ToggleProps;

/** One toggle in a `ToggleGroup`. Give it a `value`. */
export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  function ToggleGroupItem({ variant, size, ...props }, ref) {
    const group = useContext(GroupContext);
    return (
      <Toggle
        ref={ref}
        variant={variant ?? group.variant}
        // The group's size applies unless the item picks its own.
        {...({ size: size ?? group.size } as ToggleProps)}
        {...(props as object)}
      />
    );
  },
);

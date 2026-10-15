import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Tabs as TabsPrimitive } from "../../primitives/tabs.js";

type WithClassName<T> = Omit<T, "className"> & { className?: string };

/**
 * Tabs: a list of tabs and one visible panel each. Horizontal by default, or `orientation="vertical"`.
 * Keyboard: Tab enters the list at the selected tab and then moves on to the panel; the arrow keys
 * (Left and Right, or Up and Down when vertical) move focus between tabs and wrap at the ends;
 * Home and End jump; Enter or Space selects the focused tab. Add `activateOnFocus` to the list to
 * select as you arrow (best when switching is cheap). For a shareable tab, see `useUrlTab`.
 */
export const Tabs = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof TabsPrimitive.Root>>
>(function Tabs({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Root
      ref={ref}
      className={cn("flex flex-col gap-2 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
});

/** The row (or column) of tabs. Give it an accessible name with `aria-label`. */
export const TabsList = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof TabsPrimitive.List>>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md bg-muted p-1 text-muted-foreground data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  WithClassName<ComponentPropsWithoutRef<typeof TabsPrimitive.Tab>>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Tab
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors duration-(--motion-duration-fast) focus-visible:ring-2 focus-visible:ring-ring data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-elevation-1 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

/** A panel. It is focusable, so a keyboard user can reach and scroll content that has no controls. */
export const TabsContent = forwardRef<
  HTMLDivElement,
  WithClassName<ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Panel
      ref={ref}
      tabIndex={0}
      className={cn(
        "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    />
  );
});

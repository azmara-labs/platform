import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from "react";
import { cn } from "../../lib/cn.js";
import { Drawer as DrawerPrimitive } from "../../primitives/drawer.js";
import {
  BACKDROP,
  CornerClose,
  DESCRIPTION,
  ModalFooter,
  ModalHeader,
  ModalScope,
  TITLE,
  useAriaModal,
} from "./shared.js";

export type DrawerSide = "top" | "right" | "bottom" | "left";

// A drawer is dismissed by swiping toward the edge it came from.
const SWIPE = { right: "right", left: "left", top: "up", bottom: "down" } as const;

const SideContext = createContext<DrawerSide>("right");

export interface DrawerProps
  extends Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Root>, "swipeDirection"> {
  /** The edge it slides in from. Default `right`. It is dismissed by swiping back toward that edge. */
  side?: DrawerSide;
}

/**
 * A panel that slides in from an edge: a modal, like `Dialog` (focus trap, inert and scroll-locked
 * page, Escape, return focus), plus swipe to dismiss on touch.
 */
export function Drawer({ side = "right", ...props }: DrawerProps) {
  return (
    <SideContext.Provider value={side}>
      <ModalScope modal={props.modal}>
        <DrawerPrimitive.Root swipeDirection={SWIPE[side]} {...props} />
      </ModalScope>
    </SideContext.Provider>
  );
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

// Spelled out in full so the Tailwind scanner finds every class in `dist`.
const edges = {
  right:
    "inset-y-0 right-0 h-full w-80 max-w-[calc(100vw-3rem)] border-l translate-x-(--drawer-swipe-movement-x) data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  left: "inset-y-0 left-0 h-full w-80 max-w-[calc(100vw-3rem)] border-r translate-x-(--drawer-swipe-movement-x) data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  top: "inset-x-0 top-0 max-h-[85dvh] w-full rounded-b-xl border-b translate-y-(--drawer-swipe-movement-y) data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-xl border-t translate-y-(--drawer-swipe-movement-y) data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
} as const satisfies Record<DrawerSide, string>;

export interface DrawerContentProps
  extends Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>, "className"> {
  className?: string;
  /** Show the corner close button (labelled "Close"). Default true. */
  showClose?: boolean;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  { showClose = true, className, children, ...props },
  ref,
) {
  const side = useContext(SideContext);
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-azmr-backdrop=""
        className={cn(
          BACKDROP,
          // The scrim fades out as the drawer is swiped away; no easing while the finger is down.
          "opacity-[calc(1-var(--drawer-swipe-progress,0))] duration-(--motion-duration-slow) data-[swiping]:transition-none",
        )}
      />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-(--z-modal)">
        <DrawerPrimitive.Popup
          ref={ref}
          {...useAriaModal()}
          className={cn(
            "fixed flex flex-col overflow-y-auto overscroll-contain border-border bg-background p-6 text-foreground shadow-elevation-4 outline-none",
            // Follows the finger exactly while swiping, then finishes on the motion tokens.
            "transition-[translate] duration-(--motion-duration-slow) ease-standard data-[swiping]:transition-none",
            edges[side],
            className,
          )}
          {...props}
        >
          <DrawerPrimitive.Content className="grid gap-4">{children}</DrawerPrimitive.Content>
          {showClose && <CornerClose as={DrawerPrimitive.Close} />}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
});

export const DrawerHeader = ModalHeader;
export const DrawerFooter = ModalFooter;

export const DrawerTitle = forwardRef<
  HTMLHeadingElement,
  Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>, "className"> & { className?: string }
>(function DrawerTitle({ className, ...props }, ref) {
  return <DrawerPrimitive.Title ref={ref} className={cn(TITLE, className)} {...props} />;
});

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>, "className"> & {
    className?: string;
  }
>(function DrawerDescription({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Description ref={ref} className={cn(DESCRIPTION, className)} {...props} />
  );
});

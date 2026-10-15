import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { Dialog as DialogPrimitive } from "../../primitives/dialog.js";
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

/**
 * A modal dialog. While it is open focus is trapped inside it, the page behind is inert and
 * does not scroll, and Escape or a click on the scrim closes it and returns focus to the trigger.
 * Dialogs can be stacked: Escape closes only the top one.
 *
 * Name it with `DialogTitle` (required for accessibility) and describe it with
 * `DialogDescription`.
 */
export function Dialog(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  return (
    <ModalScope modal={props.modal}>
      <DialogPrimitive.Root {...props} />
    </ModalScope>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;

/** Closes the dialog. Put it inside `DialogContent`; use `render` to style it as a `Button`. */
export const DialogClose = DialogPrimitive.Close;

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)]",
} as const;

export interface DialogContentProps
  extends Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>, "className"> {
  className?: string;
  /** Maximum width. Default `md`. All sizes stay inside the viewport on small screens. */
  size?: keyof typeof sizes;
  /** Show the corner close button (labelled "Close"). Default true. */
  showClose?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { size = "md", showClose = true, className, children, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop data-azmr-backdrop="" className={BACKDROP} />
      <DialogPrimitive.Viewport className="fixed inset-0 z-(--z-modal) flex overflow-y-auto overscroll-contain p-4">
        <DialogPrimitive.Popup
          ref={ref}
          {...useAriaModal()}
          className={cn(
            "relative mx-auto my-auto grid w-full gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-elevation-4 outline-none",
            "transition-[opacity,scale] duration-(--motion-duration-base) ease-standard data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
          {showClose && <CornerClose as={DialogPrimitive.Close} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
});

export const DialogHeader = ModalHeader;
export const DialogFooter = ModalFooter;

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Title>, "className"> & { className?: string }
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn(TITLE, className)} {...props} />;
});

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Description>, "className"> & {
    className?: string;
  }
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description ref={ref} className={cn(DESCRIPTION, className)} {...props} />
  );
});

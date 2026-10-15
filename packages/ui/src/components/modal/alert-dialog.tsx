import { type ComponentPropsWithoutRef, forwardRef, useCallback, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { AlertDialog as AlertDialogPrimitive } from "../../primitives/alert-dialog.js";
import { buttonVariants } from "../button/button.js";
import { BACKDROP, DESCRIPTION, ModalFooter, ModalHeader, TITLE } from "./shared.js";

/**
 * A dialog that interrupts to ask for a decision, usually before something destructive. It is
 * announced as an alert dialog, it is **not** closed by a click outside (the person must choose),
 * and focus starts on `AlertDialogCancel`, the least destructive choice, so pressing Enter by
 * reflex cannot delete anything. Escape still cancels.
 */
export const AlertDialog = AlertDialogPrimitive.Root;

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export type AlertDialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Popup>,
  "className"
> & { className?: string };

export const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogContentProps>(
  function AlertDialogContent({ className, initialFocus, children, ...props }, ref) {
    const popup = useRef<HTMLDivElement | null>(null);
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        popup.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    return (
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop data-azmr-backdrop="" className={BACKDROP} />
        <AlertDialogPrimitive.Viewport className="fixed inset-0 z-(--z-modal) flex overflow-y-auto overscroll-contain p-4">
          <AlertDialogPrimitive.Popup
            ref={setRef}
            aria-modal
            // The least destructive choice gets focus; fall back to Base UI's default if there is none.
            initialFocus={
              initialFocus ??
              (() => popup.current?.querySelector<HTMLElement>("[data-azmr-cancel]") ?? true)
            }
            className={cn(
              "relative mx-auto my-auto grid w-full max-w-md gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-elevation-4 outline-none",
              "transition-[opacity,scale] duration-(--motion-duration-base) ease-standard data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              className,
            )}
            {...props}
          >
            {children}
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Viewport>
      </AlertDialogPrimitive.Portal>
    );
  },
);

export const AlertDialogHeader = ModalHeader;
export const AlertDialogFooter = ModalFooter;

export const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>, "className"> & {
    className?: string;
  }
>(function AlertDialogTitle({ className, ...props }, ref) {
  return <AlertDialogPrimitive.Title ref={ref} className={cn(TITLE, className)} {...props} />;
});

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>, "className"> & {
    className?: string;
  }
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description ref={ref} className={cn(DESCRIPTION, className)} {...props} />
  );
});

/** The safe choice. It closes the dialog and receives focus first. */
export const AlertDialogCancel = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>, "className"> & {
    className?: string;
  }
>(function AlertDialogCancel({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Close
      ref={ref}
      data-azmr-cancel=""
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
});

export interface AlertDialogActionProps
  extends Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Close>, "className"> {
  className?: string;
  /** `destructive` (default) for an irreversible action; `default` for a plain confirmation. */
  tone?: "default" | "destructive";
}

/** The confirming choice. It runs `onClick`, then closes the dialog. */
export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  function AlertDialogAction({ tone = "destructive", className, ...props }, ref) {
    return (
      <AlertDialogPrimitive.Close
        ref={ref}
        className={cn(
          buttonVariants({ variant: tone === "destructive" ? "destructive" : "default" }),
          className,
        )}
        {...props}
      />
    );
  },
);

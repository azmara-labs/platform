import { X } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
} from "react";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { buttonVariants } from "../button/button.js";

/**
 * The dimming layer behind a modal surface. `data-azmr-backdrop` lets tests and apps find it.
 * It fades with the motion tokens.
 */
export const BACKDROP =
  "fixed inset-0 z-(--z-overlay) bg-scrim transition-opacity duration-(--motion-duration-base) ease-standard data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

/** Layout shared by every modal's header, footer, title and description. */
export const HEADER = "flex flex-col gap-1.5 pr-8 text-left";
export const FOOTER = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";
export const TITLE = "text-lg font-semibold leading-none tracking-tight";
export const DESCRIPTION = "text-sm text-muted-foreground";

export const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ModalHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn(HEADER, className)} {...props} />;
  },
);

export const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ModalFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn(FOOTER, className)} {...props} />;
  },
);

const CLOSE_BUTTON = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "absolute right-2 top-2 size-8",
);

/** The corner "X". `as` is whichever Base UI close part the surface uses. */
export function CornerClose({
  as: Close,
}: {
  as: ComponentType<ComponentPropsWithoutRef<"button">>;
}) {
  return (
    <Close aria-label="Close" className={CLOSE_BUTTON}>
      <Icon icon={X} />
    </Close>
  );
}

/**
 * Whether the surface is modal. Base UI makes the page inert for a modal but never sets
 * `aria-modal`, which assistive technology still uses to confine its reading to the dialog.
 */
const ModalFlag = createContext(true);

export function ModalScope({
  modal,
  children,
}: {
  modal?: boolean | "trap-focus";
  children: ReactNode;
}) {
  return <ModalFlag.Provider value={modal !== false}>{children}</ModalFlag.Provider>;
}

/** The `aria-modal` attribute for a popup: "true" when modal, absent when not. */
export function useAriaModal(): { "aria-modal"?: true } {
  return useContext(ModalFlag) ? { "aria-modal": true } : {};
}

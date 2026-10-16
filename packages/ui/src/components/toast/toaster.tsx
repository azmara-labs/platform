import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Toast as ToastPrimitive } from "../../primitives/toast.js";
import { buttonVariants } from "../button/button.js";
import { Spinner } from "../spinner/spinner.js";
import { toastManager } from "./toast.js";

export type ToasterPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ToasterProps {
  /** Where the stack sits. Default `bottom-right`. New toasts come in from that edge. */
  position?: ToasterPosition;
  /** The most toasts shown at once; older ones wait behind. Default 3. */
  limit?: number;
  /** Default milliseconds before a toast dismisses itself. `0` never does. Default 5000. */
  duration?: number;
  /** The accessible name of the notifications region. Default "Notifications". */
  label?: string;
  className?: string;
}

// Written out in full so the Tailwind scanner finds every class in `dist`.
const VIEWPORT = "fixed z-(--z-toast) w-[calc(100vw-2rem)] outline-none sm:w-96";
const PLACEMENT = {
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
} as const satisfies Record<ToasterPosition, string>;

const SWIPE = {
  "top-left": ["up", "left"],
  "top-center": ["up"],
  "top-right": ["up", "right"],
  "bottom-left": ["down", "left"],
  "bottom-center": ["down"],
  "bottom-right": ["down", "right"],
} as const satisfies Record<ToasterPosition, readonly ("up" | "down" | "left" | "right")[]>;

/**
 * The stack is anchored to one edge. `--dir` is -1 when that edge is the bottom and 1 when it is
 * the top, so the same offsets work for both: toasts further back peek out toward the middle of
 * the screen, and the stack fans out the same way when it is hovered or focused.
 */
const ROOT_COMMON = cn(
  "[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))]",
  "[--offset-y:calc(var(--dir)*(var(--toast-offset-y)+var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))]",
  "absolute right-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 h-(--height) w-full select-none",
  "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+var(--dir)*(var(--toast-index)*var(--peek)+var(--shrink)*var(--height))))_scale(var(--scale))]",
  "data-[expanded]:h-(--toast-height) data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
  "rounded-lg border border-border bg-popover text-popover-foreground shadow-elevation-3",
  "transition-[transform,opacity,height] duration-(--motion-duration-slow) ease-decelerate data-[swiping]:transition-none",
  "data-[limited]:opacity-0 data-[ending-style]:opacity-0",
  // Entering and leaving without a swipe: slide toward the anchored edge.
  "data-[starting-style]:[transform:translateY(calc(var(--dir)*-150%))] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(calc(var(--dir)*-150%))]",
  // Leaving by swipe: carry on in the swipe direction.
  "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
  "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
  // Keeps the pointer "inside" the stack across the gap between toasts, so it does not collapse.
  "after:absolute after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
);
const ROOT_BOTTOM = "[--dir:-1] bottom-0 origin-bottom after:top-full";
const ROOT_TOP = "[--dir:1] top-0 origin-top after:bottom-full";

const ICONS = {
  success: { icon: CircleCheck, colour: "text-success" },
  error: { icon: CircleAlert, colour: "text-destructive" },
  warning: { icon: TriangleAlert, colour: "text-warning-text" },
  info: { icon: Info, colour: "text-info" },
} as const;

function TypeIcon({ type }: { type?: string }) {
  if (type === "loading") return <Spinner className="mt-0.5 shrink-0 text-muted-foreground" />;
  const entry = ICONS[type as keyof typeof ICONS];
  if (!entry) return null;
  return (
    <Icon
      icon={entry.icon}
      data-azmr-toast-icon=""
      className={cn("mt-0.5 shrink-0", entry.colour)}
    />
  );
}

function ToastList({ position }: { position: ToasterPosition }) {
  const { toasts } = ToastPrimitive.useToastManager();
  const edge = position.startsWith("top") ? ROOT_TOP : ROOT_BOTTOM;
  return toasts.map((t) => (
    <ToastPrimitive.Root
      key={t.id}
      toast={t}
      swipeDirection={[...SWIPE[position]]}
      data-toast=""
      className={cn(ROOT_COMMON, edge)}
    >
      <ToastPrimitive.Content
        data-toast-content=""
        className="flex items-start gap-3 overflow-hidden p-4 transition-opacity duration-(--motion-duration-base) ease-standard data-[behind]:opacity-0 data-[expanded]:opacity-100"
      >
        <TypeIcon type={t.type} />
        <div className="grid min-w-0 flex-1 gap-1">
          <ToastPrimitive.Title className="text-sm font-medium leading-tight" />
          <ToastPrimitive.Description className="text-sm text-muted-foreground" />
          <ToastPrimitive.Action
            // Whatever the action does, the toast has served its purpose.
            onClick={() => toastManager.close(t.id)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-2 justify-self-start",
            )}
          />
        </div>
        <ToastPrimitive.Close
          aria-label="Dismiss notification"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "-mr-2 -mt-2 size-8 shrink-0",
          )}
        >
          <Icon icon={X} />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  ));
}

/**
 * Renders the toasts raised by `toast.*`. Mount it once, near the root of the app.
 *
 * Toasts pause their timer while the pointer is over the stack or focus is inside it, the stack
 * fans out on hover or focus, and each toast can be swiped away toward the edge it came from.
 * F6 jumps keyboard focus into the stack. The region is a polite live region; errors are announced
 * urgently.
 */
export function Toaster({
  position = "bottom-right",
  limit = 3,
  duration = 5000,
  label = "Notifications",
  className,
}: ToasterProps) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} limit={limit} timeout={duration}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          aria-label={label}
          className={cn(VIEWPORT, PLACEMENT[position], className)}
        >
          <ToastList position={position} />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

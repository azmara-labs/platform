import type { ReactNode } from "react";
import { Toast } from "../../primitives/toast.js";

/** The one manager behind every `toast.*` call. The `Toaster` you mount renders it. */
export const toastManager = Toast.createToastManager();

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  /** A second line under the title. */
  description?: ReactNode;
  /**
   * Milliseconds before it dismisses itself. `0` keeps it until dismissed. Defaults to the
   * `Toaster`'s `duration` (5000), and loading toasts never time out.
   */
  duration?: number;
  /** Showing a toast with an id that is already visible updates that toast instead of stacking another. */
  id?: string;
  /**
   * `high` is announced urgently (`role="alert"`), `low` politely. Errors are `high` by default,
   * everything else `low`.
   */
  priority?: "low" | "high";
  /** A button in the toast, such as Undo. It runs `onClick` and then dismisses the toast. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Called when the toast is dismissed, by the person or by the timer. */
  onClose?: () => void;
}

export interface ToastUpdate extends ToastOptions {
  title?: ReactNode;
  type?: ToastType | "default";
}

function toBaseOptions(
  title: ReactNode | undefined,
  type: ToastType | undefined,
  o: ToastOptions = {},
) {
  const { description, duration, id, priority, action, onClose } = o;
  return {
    ...(id !== undefined && { id }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(type && { type }),
    ...(priority && { priority }),
    ...(duration !== undefined && { timeout: duration }),
    ...(onClose && { onClose }),
    ...(action && { actionProps: { children: action.label, onClick: action.onClick } }),
  } as const;
}

/** How urgently a type is announced when the caller does not say: only errors interrupt. */
const defaultPriority = (type: ToastType | undefined) => (type === "error" ? "high" : "low");

function show(type: ToastType | undefined) {
  return (title: ReactNode, options?: ToastOptions) =>
    toastManager.add({
      priority: defaultPriority(type),
      ...toBaseOptions(title, type, options),
    });
}

/**
 * Show a notification from anywhere, including outside React. Mount one `<Toaster />` near the root
 * first; a toast shown before it is mounted has nowhere to render. Every method returns the toast's id.
 */
export const toast = Object.assign(show(undefined), {
  success: show("success"),
  error: show("error"),
  info: show("info"),
  warning: show("warning"),
  /** Stays until updated or dismissed. Pair it with `toast.update`, or use `toast.promise`. */
  loading: show("loading"),

  /** Show `loading`, then `success` or `error` when the promise settles. Returns the same promise. */
  promise<Value, Reason = Error>(
    promise: Promise<Value>,
    messages: {
      loading: string;
      success: string | ((value: Value) => string);
      error: string | ((error: Reason) => string);
    },
  ): Promise<Value> {
    return toastManager.promise(promise, {
      loading: { title: messages.loading, priority: "low" },
      success: (value) => ({
        title: typeof messages.success === "function" ? messages.success(value) : messages.success,
        priority: "low",
        timeout: undefined,
      }),
      error: (error) => ({
        title: typeof messages.error === "function" ? messages.error(error) : messages.error,
        priority: "high",
        timeout: undefined,
      }),
    });
  },

  /** Change a toast that is showing: its text, its type or its timer. */
  update(id: string, changes: ToastUpdate) {
    const { title, type, ...rest } = changes;
    toastManager.update(id, {
      // Only re-derive urgency when the type changes; a text-only update must not downgrade an error.
      ...(type && { priority: defaultPriority(type === "default" ? undefined : type) }),
      ...toBaseOptions(title, type === "default" ? undefined : type, rest),
      ...(type === "default" && { type: undefined }),
    });
  },

  /** Dismiss one toast, or all of them when called without an id. */
  dismiss(id?: string) {
    toastManager.close(id);
  },
});

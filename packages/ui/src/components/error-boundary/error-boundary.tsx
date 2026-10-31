import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../button/button.js";
import { StateView, type StateViewProps } from "../state-view/state-view.js";

export interface ErrorBoundaryFallbackProps {
  /** What was thrown. Not always an `Error`; never show its message to users by default. */
  error: unknown;
  /** Clears the error and renders the children again. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * What to show instead of the children. Default: a `StateView` error with a generic message and
   * a "Try again" button (no error details, which can carry personal or internal data).
   */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /**
   * Called once per caught error, for reporting (Sentry, PostHog, your own logger). Not called
   * for errors `rethrow` lets through.
   */
  onError?: (error: unknown, info: ErrorInfo) => void;
  /** Called when the boundary resets, by `reset()` or a change in `resetKeys`. */
  onReset?: () => void;
  /** Reset automatically when any of these change (a route, a record id, a filter). */
  resetKeys?: readonly unknown[];
  /**
   * Throws errors this boundary must not handle, so they reach the framework. In Next.js pass
   * `unstable_rethrow` from `next/navigation`, so `redirect()` and `notFound()` keep working.
   */
  rethrow?: (error: unknown) => void;
  /** Props for the default fallback (title, description, variant...). Ignored with `fallback`. */
  fallbackProps?: Omit<StateViewProps, "state">;
}

interface State {
  error: unknown;
  failed: boolean;
}

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));

/** True when `rethrow` would throw `error` on, i.e. it is not this boundary's to handle. */
function passesThrough(rethrow: ErrorBoundaryProps["rethrow"], error: unknown) {
  if (!rethrow) return false;
  try {
    rethrow(error);
    return false;
  } catch {
    return true;
  }
}

/**
 * Catches errors thrown while rendering its children and shows a fallback with a way to recover,
 * instead of a blank page. Report errors with `onError`; recover with `reset` or `resetKeys`.
 * Errors in event handlers and async code are not render errors: catch those where they happen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null, failed: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (passesThrough(this.props.rethrow, error)) return;
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.failed && changed(previous.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = () => {
    this.setState({ error: null, failed: false });
    this.props.onReset?.();
  };

  override render() {
    const { failed, error } = this.state;
    if (!failed) return this.props.children;

    // Framework errors (a Next.js redirect or notFound) go on up to the framework.
    this.props.rethrow?.(error);

    const { fallback, fallbackProps } = this.props;
    if (typeof fallback === "function") return fallback({ error, reset: this.reset });
    if (fallback !== undefined) return fallback;
    return (
      <StateView
        state="error"
        description="This part of the page couldn't load. Try again, or come back later."
        action={
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        }
        {...fallbackProps}
      />
    );
  }
}

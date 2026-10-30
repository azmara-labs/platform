import type { ComponentType, ReactNode } from "react";
import * as React from "react";
import { useReducedMotion } from "../../use-reduced-motion.js";

type TransitionClass = string | Record<string, string>;

export interface TransitionProps {
  children?: ReactNode;
  /** Gives the element a name, so the same name on another page or list item morphs between them. */
  name?: string;
  /** The animation when none of the more specific ones below apply. `"none"` turns it off. */
  default?: TransitionClass;
  enter?: TransitionClass;
  exit?: TransitionClass;
  update?: TransitionClass;
  /** Used when this and another element share a `name` (the shared-element morph). */
  share?: TransitionClass;
}

type ViewTransitionComponent = ComponentType<TransitionProps>;

/**
 * React's `ViewTransition`, if this React has it: stable from React 19.3, missing before. The peer
 * range still allows React 18 and older 19s, so it is looked up by name at render time, under both
 * the stable and the experimental name.
 */
export function findViewTransition(
  react: Record<string, unknown> = React as unknown as Record<string, unknown>,
): ViewTransitionComponent | undefined {
  return (react.ViewTransition ?? react.unstable_ViewTransition) as
    | ViewTransitionComponent
    | undefined;
}

/** Builds a `Transition` around a lookup. Exported so the behaviour can be tested without a new React. */
export function createTransition(find: () => ViewTransitionComponent | undefined) {
  // biome-ignore lint/correctness/noComponentHookFactories: a factory by design; callers build the component once, at module level
  return function Transition(props: TransitionProps) {
    const reduced = useReducedMotion();
    const ViewTransition = find();
    // No support, or the person has asked for less motion: just the children, no wrapper.
    if (!ViewTransition || reduced) return <>{props.children}</>;
    return <ViewTransition {...props} />;
  };
}

/**
 * Animates a route change, a list change or a shared element with React's `ViewTransition` (React
 * 19.3 and later). On an older React, or when the person prefers reduced motion, it renders its
 * children and nothing else, so it switches on when you upgrade React, with no code change. The
 * cross-fade itself is in `@azmr/ui/styles.css` (opacity only).
 */
export const Transition = createTransition(findViewTransition);

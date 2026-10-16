import { cloneElement, createElement, type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";

/**
 * Renders `tag`, or your own element (a router's `Link`) in its place: `render` receives our props
 * and children, and keeps its own props (an `href`, say). No hooks, so it works in Server Components.
 */
export function renderElement(
  render: ReactElement | undefined,
  tag: "a" | "button" | "span",
  props: Record<string, unknown> & { className?: string },
  children: ReactNode,
) {
  if (!render) return createElement(tag, props, children);
  const own = render.props as { className?: string };
  return cloneElement(
    render,
    { ...props, ...own, className: cn(props.className, own.className) } as never,
    children,
  );
}

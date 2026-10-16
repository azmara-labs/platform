import {
  Children,
  type CSSProperties,
  cloneElement,
  createElement,
  type ElementType,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn.js";
import { motionPresets } from "./presets.js";

export interface StaggerProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /** The element to render. Default `div`; use `ul` or `ol` for a list. */
  as?: ElementType;
  /** The last index that gets its own delay, so a long list does not take forever to appear. Default 12. */
  max?: number;
}

/**
 * Makes the children of a list enter one after another. Each child gets a `--stagger-index`, and the
 * delay is `index x --motion-stagger-step` (40 ms), capped at `max`. Under reduced motion the step is
 * zero and they fade in together. Only elements are staggered; text is left alone. Server-safe.
 */
export function Stagger({ as = "div", max = 12, className, children, ...props }: StaggerProps) {
  let index = 0;
  const items = Children.toArray(children).map((child) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{ className?: string; style?: CSSProperties }>;
    const style = {
      ...element.props.style,
      "--stagger-index": Math.min(index++, max),
    } as CSSProperties;
    return cloneElement(element, {
      className: cn(element.props.className, motionPresets.stagger.item),
      style,
    });
  });
  return createElement(
    as,
    { className: cn(motionPresets.stagger.container, className), ...props },
    items,
  );
}

import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "../../lib/cn.js";
import type { LayoutElement } from "./scale.js";

export const CONTAINER_SIZE_CLASSES = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "2xl": "max-w-[96rem]",
  full: "max-w-none",
} as const;

export type ContainerSize = keyof typeof CONTAINER_SIZE_CLASSES;

export interface ContainerProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The widest the content gets (42, 56, 72, 80, 96rem); `full` removes the limit. Default `lg`. */
  size?: ContainerSize;
  /** Horizontal padding that grows with the screen. Default true. */
  gutters?: boolean;
  as?: LayoutElement;
  children?: ReactNode;
}

/** Centres content and limits its width. Server-safe. */
export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { size = "lg", gutters = true, as: Component = "div", className, children, ...props },
  ref,
) {
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn(
        "mx-auto w-full",
        CONTAINER_SIZE_CLASSES[size],
        gutters && "px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

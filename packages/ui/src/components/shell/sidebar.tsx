import {
  Children,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn.js";
import { ScrollArea } from "../scroll-area/index.js";

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** A slot at the bottom of the `Sidebar`, outside the scrolling list (an account menu, say). */
export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(function SidebarFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "shrink-0 border-sidebar-border border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
});

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The landmark's name, e.g. "Main". Required: a page can have several navigations. */
  label: string;
  children: ReactNode;
}

const isFooter = (child: ReactNode): child is ReactElement =>
  isValidElement(child) && child.type === SidebarFooter;

/**
 * The side navigation: a `nav` landmark whose list scrolls on its own, with an optional
 * `SidebarFooter` pinned below it. A flat sheet on the `--sidebar` colours; it fills its
 * container, which decides the width.
 */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { label, className, children, ...props },
  ref,
) {
  const all = Children.toArray(children);
  const footer = all.filter(isFooter);
  const content = all.filter((child) => !isFooter(child));
  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cn("flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground", className)}
      {...props}
    >
      <ScrollArea
        aria-label={label}
        className="min-h-0 flex-1 rounded-none"
        viewportClassName="px-3 py-4"
      >
        {content}
      </ScrollArea>
      {footer}
    </nav>
  );
});

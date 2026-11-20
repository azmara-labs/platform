import {
  type AnchorHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { cn } from "../../lib/cn.js";
import { renderElement } from "../shared/render-element.js";

/** A badge is shown for a non-empty string or a number above 0; numbers over 99 read `99+`. */
function formatBadge(badge: number | string | undefined): string | undefined {
  if (typeof badge === "number") return badge > 99 ? "99+" : badge > 0 ? String(badge) : undefined;
  return badge ? badge : undefined;
}

export interface NavItemProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /** Shown before the label. Decorative: hidden from assistive technology. */
  icon?: ReactNode;
  /** A count or short word after the label. Hidden for 0 and an empty string; numbers over 99 read `99+`. */
  badge?: number | string;
  /** The page being shown. Sets `aria-current="page"` and the highlight. */
  current?: boolean;
  /** Render your router's `Link` instead of an `<a>`: `render={<NextLink href="/x" />}`. */
  render?: ReactElement;
  children: ReactNode;
}

const ITEM =
  "flex min-h-8 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground outline-none transition-colors duration-(--motion-duration-fast) hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring";
const CURRENT = "bg-sidebar-accent font-medium text-sidebar-accent-foreground";
const BADGE =
  "ms-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-xs font-medium text-sidebar-primary-foreground";

/** One link in a `NavGroup`. Renders a list item holding an `<a>` (or your router's link). */
export const NavItem = forwardRef<HTMLAnchorElement, NavItemProps>(function NavItem(
  { icon, badge, current, render, className, children, ...props },
  ref,
) {
  const shown = formatBadge(badge);
  return (
    <li>
      {renderElement(
        render,
        "a",
        {
          ref,
          "aria-current": current ? "page" : undefined,
          ...props,
          className: cn(ITEM, current && CURRENT, className),
        },
        <>
          {icon ? (
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center"
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate">{children}</span>
          {shown ? (
            <span data-nav-badge="" className={BADGE}>
              {shown}
            </span>
          ) : null}
        </>,
      )}
    </li>
  );
});

export interface NavGroupProps extends Omit<HTMLAttributes<HTMLUListElement>, "title"> {
  /** A heading for the group. It names the list, so assistive technology announces it. */
  title?: string;
}

/** A list of `NavItem`s with an optional heading. Put every `NavItem` inside one. */
export const NavGroup = forwardRef<HTMLUListElement, NavGroupProps>(function NavGroup(
  { title, className, children, ...props },
  ref,
) {
  const headingId = useId();
  return (
    <div className="mb-4 last:mb-0">
      {title ? (
        <h2
          id={headingId}
          className="px-3 pb-1 font-medium text-sidebar-foreground/70 text-xs uppercase tracking-wide"
        >
          {title}
        </h2>
      ) : null}
      <ul
        ref={ref}
        aria-labelledby={title ? headingId : undefined}
        className={cn("grid gap-0.5", className)}
        {...props}
      >
        {children}
      </ul>
    </div>
  );
});

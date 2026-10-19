import {
  type AnchorHTMLAttributes,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type OlHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronRight, Ellipsis } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { renderElement } from "../shared/render-element.js";

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** The landmark's name. Default "Breadcrumb"; change it for translation, or with two trails on a page. */
  label?: string;
}

/** A navigation landmark holding the trail. Server-safe. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { label = "Breadcrumb", ...props },
  ref,
) {
  return <nav ref={ref} aria-label={label} {...props} />;
});

export const BreadcrumbList = forwardRef<HTMLOListElement, OlHTMLAttributes<HTMLOListElement>>(
  function BreadcrumbList({ className, ...props }, ref) {
    return (
      <ol
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

export const BreadcrumbItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  function BreadcrumbItem({ className, ...props }, ref) {
    return (
      <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
    );
  },
);

export interface BreadcrumbLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render your router's `Link` instead of an `<a>`: `render={<NextLink href="/x" />}`. */
  render?: ReactElement;
}

const LINK =
  "rounded-sm text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  function BreadcrumbLink({ render, className, children, ...props }, ref) {
    return renderElement(render, "a", { ref, ...props, className: cn(LINK, className) }, children);
  },
);

/** Where you are. Plain text, not a link, marked `aria-current="page"`. */
export const BreadcrumbPage = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  function BreadcrumbPage({ className, ...props }, ref) {
    return (
      <span
        ref={ref}
        aria-current="page"
        className={cn("font-medium text-foreground", className)}
        {...props}
      />
    );
  },
);

/** The mark between items. Decorative: hidden from assistive technology. A chevron by default. */
export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      data-azmr-separator=""
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <Icon icon={ChevronRight} />}
    </li>
  );
}

/** Stands for items left out of a long trail. For a menu of the hidden pages, wrap it in a `DropdownMenu`. */
export function BreadcrumbEllipsis({
  label = "More pages",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { label?: string }) {
  return (
    <span className={cn("flex size-9 items-center justify-center", className)} {...props}>
      <Icon icon={Ellipsis} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface BreadcrumbEntry {
  label: ReactNode;
  /** Where the item links. The last item is always shown as the current page, whatever it has. */
  href?: string;
}

export interface BreadcrumbsProps extends Omit<BreadcrumbProps, "children"> {
  items: readonly BreadcrumbEntry[];
  /**
   * Collapse a longer trail: keep the first item, an ellipsis, and the last items, `maxItems` in all
   * (the ellipsis counts as one). Default: never collapse.
   */
  maxItems?: number;
  /** Replace the chevron between items. */
  separator?: ReactNode;
  /** Render your router's `Link`: `renderLink={(href) => <NextLink href={href} />}`. */
  renderLink?: (href: string) => ReactElement;
  /** The ellipsis's spoken name. Default "More pages". */
  ellipsisLabel?: string;
}

/** A trail from data. Built from the parts above; use those directly for custom layouts. */
export function Breadcrumbs({
  items,
  maxItems,
  separator,
  renderLink,
  ellipsisLabel,
  ...props
}: BreadcrumbsProps) {
  if (items.length === 0) return null;
  const collapse = maxItems !== undefined && items.length > Math.max(maxItems, 2);
  const lastCount = Math.max(1, (maxItems ?? 0) - 2);
  const visible: (BreadcrumbEntry | "ellipsis")[] = collapse
    ? [items[0] as BreadcrumbEntry, "ellipsis", ...items.slice(items.length - lastCount)]
    : [...items];

  return (
    <Breadcrumb {...props}>
      <BreadcrumbList>
        {visible.map((entry, index) => {
          const isLast = index === visible.length - 1;
          return (
            // The position is the identity: the list is static and never reordered.
            // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
            <Fragment key={index}>
              <BreadcrumbItem>
                {entry === "ellipsis" ? (
                  <BreadcrumbEllipsis label={ellipsisLabel} />
                ) : isLast ? (
                  <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                ) : entry.href ? (
                  <BreadcrumbLink href={entry.href} render={renderLink?.(entry.href)}>
                    {entry.label}
                  </BreadcrumbLink>
                ) : (
                  <span>{entry.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

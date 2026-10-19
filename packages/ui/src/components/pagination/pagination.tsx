import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Ellipsis } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { buttonVariants } from "../button/variants.js";
import { renderElement } from "../shared/render-element.js";
import { getPageRange } from "./page-range.js";

export const PaginationNav = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & { label?: string }
>(function PaginationNav({ label = "Pagination", ...props }, ref) {
  return <nav ref={ref} aria-label={label} {...props} />;
});

export const PaginationList = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  function PaginationList({ className, ...props }, ref) {
    return (
      <ul
        ref={ref}
        className={cn("flex flex-row flex-wrap items-center gap-1", className)}
        {...props}
      />
    );
  },
);

export const PaginationItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  function PaginationItem(props, ref) {
    return <li ref={ref} {...props} />;
  },
);

type LinkBase = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export interface PaginationLinkProps extends LinkBase {
  /** The current page: filled, and `aria-current="page"`. */
  isActive?: boolean;
  /** Where it goes. Without one it renders a `<button>` (for client state). */
  href?: string;
  onClick?: () => void;
  /** Cannot be used. A link loses its `href` and is announced as disabled; a button is `disabled`. */
  disabled?: boolean;
  /** Square (a page number) or sized for text (Previous and Next). Default `icon`. */
  size?: "icon" | "md";
  /** Render your router's `Link` instead of an `<a>`. */
  render?: ReactElement;
}

/** One page control: a link when it has an `href`, otherwise a button. */
export const PaginationLink = forwardRef<HTMLElement, PaginationLinkProps>(function PaginationLink(
  { isActive, href, onClick, disabled, size = "icon", render, className, children, ...props },
  ref,
) {
  const cls = cn(
    buttonVariants({ variant: isActive ? "default" : "ghost", size }),
    disabled && "pointer-events-none opacity-50",
    className,
  );
  const common = { ref, "aria-current": isActive ? "page" : undefined, ...props, className: cls };
  if (href !== undefined || render) {
    return renderElement(
      // A disabled control must not be navigable, so it never takes the router element (whose own `href` would win).
      disabled ? undefined : render,
      "a",
      disabled ? { ...common, "aria-disabled": "true" } : { ...common, href, onClick },
      children,
    );
  }
  return renderElement(
    undefined,
    "button",
    { ...common, type: "button", disabled, onClick: disabled || isActive ? undefined : onClick },
    children,
  );
});

export function PaginationEllipsis({
  label = "More pages",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { label?: string }) {
  return (
    <span
      data-azmr-ellipsis=""
      className={cn("flex size-(--density-control-height) items-center justify-center", className)}
      {...props}
    >
      <Icon icon={Ellipsis} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** The current page, 1-based. */
  page: number;
  pageCount: number;
  /** Link mode: where each page goes. Works in Server Components. Wins over `onPageChange`. */
  hrefFor?: (page: number) => string;
  /** Button mode: called with the page that was chosen. For client state. */
  onPageChange?: (page: number) => void;
  /** Render your router's `Link`: `renderLink={(href) => <NextLink href={href} />}`. */
  renderLink?: (href: string) => ReactElement;
  /** Pages shown either side of the current one. Default 1. */
  siblingCount?: number;
  /** Pages always shown at each end. Default 1. */
  boundaryCount?: number;
  /** Show Previous and Next. Default true. */
  showPrevNext?: boolean;
  /** The landmark's name. Default "Pagination". */
  label?: string;
  /** Names the controls, for translation. */
  labels?: { previous?: string; next?: string; page?: (page: number) => string; more?: string };
}

/**
 * A page control. Give it `hrefFor` and it is a set of real links that work without JavaScript (and
 * in Server Components); give it `onPageChange` and it is a set of buttons for client state. Either
 * way the current page is `aria-current="page"` and Previous and Next are disabled at the ends.
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  onPageChange,
  renderLink,
  siblingCount,
  boundaryCount,
  showPrevNext = true,
  label,
  labels,
  ...props
}: PaginationProps) {
  const items = getPageRange({ page, pageCount, siblingCount, boundaryCount });
  if (items.length === 0) return null;
  const count = Math.floor(pageCount);
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), count);
  const pageLabel = labels?.page ?? ((p: number) => `Page ${p}`);

  const control = (target: number, extra: Partial<PaginationLinkProps>, children: ReactNode) => {
    const href = hrefFor?.(target);
    return (
      <PaginationLink
        {...(href !== undefined
          ? { href, render: renderLink?.(href) }
          : { onClick: () => onPageChange?.(target) })}
        {...extra}
      >
        {children}
      </PaginationLink>
    );
  };

  return (
    <PaginationNav label={label} {...props}>
      <PaginationList>
        {showPrevNext && (
          <PaginationItem>
            {control(
              current - 1,
              {
                size: "md",
                disabled: current <= 1,
                "aria-label": labels?.previous ?? "Previous page",
              },
              <>
                <Icon icon={ChevronLeft} />
                <span className="hidden sm:inline">Previous</span>
              </>,
            )}
          </PaginationItem>
        )}
        {items.map((item) =>
          typeof item === "number" ? (
            <PaginationItem key={item}>
              {control(item, { isActive: item === current, "aria-label": pageLabel(item) }, item)}
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationEllipsis label={labels?.more} />
            </PaginationItem>
          ),
        )}
        {showPrevNext && (
          <PaginationItem>
            {control(
              current + 1,
              { size: "md", disabled: current >= count, "aria-label": labels?.next ?? "Next page" },
              <>
                <span className="hidden sm:inline">Next</span>
                <Icon icon={ChevronRight} />
              </>,
            )}
          </PaginationItem>
        )}
      </PaginationList>
    </PaginationNav>
  );
}

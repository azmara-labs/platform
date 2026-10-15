import {
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../lib/cn.js";
import {
  ALIGN_CLASSES,
  type TypographyAlign,
  type TypographyVariant,
  typographyVariants,
} from "./variants.js";

export interface TypographyOwnProps {
  /** The type-scale step. It picks the semantic element and the look. Default `body`. */
  variant?: TypographyVariant;
  align?: TypographyAlign;
  /** Truncate to one line with an ellipsis. */
  noWrap?: boolean;
  /** Add a small bottom margin (MUI's `gutterBottom`). */
  gutterBottom?: boolean;
}

export type TypographyProps<T extends ElementType = "p"> = TypographyOwnProps & {
  /** Render a different element or component, keeping the look: `variant="h1" as="h2"`. */
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof TypographyOwnProps | "as">;

function TypographyImpl(
  {
    variant = "body",
    as,
    align,
    noWrap,
    gutterBottom,
    className,
    ...props
  }: TypographyProps<ElementType>,
  ref: Ref<HTMLElement>,
) {
  const definition = typographyVariants[variant];
  const Component: ElementType = as ?? definition.element;
  return (
    <Component
      ref={ref}
      className={cn(
        definition.classes,
        align && ALIGN_CLASSES[align],
        noWrap && "truncate",
        gutterBottom && "mb-[0.35em]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Text with a type-scale variant. The variant decides the semantic element (`h1` to `h6`, `p`,
 * `span`), and `as` overrides it without changing the look. Server-safe.
 */
export const Typography = forwardRef(TypographyImpl) as <T extends ElementType = "p">(
  props: TypographyProps<T> & { ref?: Ref<HTMLElement> },
) => ReactElement | null;

// ---------------------------------------------------------------------------------------------

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingSize = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface HeadingProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "children">,
    Omit<TypographyOwnProps, "variant"> {
  /** The semantic level (`<h2>`). Default 2. */
  level?: HeadingLevel;
  /** The visual size when it should differ from the level, e.g. a quiet `<h2>`. */
  size?: HeadingSize;
  children?: ReactNode;
}

/** A heading whose semantic level and visual size are separate decisions. */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 2, size, ...props },
  ref,
) {
  return (
    <Typography
      ref={ref as Ref<HTMLElement>}
      as={`h${level}` as `h${HeadingLevel}`}
      variant={size ?? (`h${level}` as HeadingSize)}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------------------------

const TONE_CLASSES = {
  muted: "text-muted-foreground",
  destructive: "text-destructive",
  success: "text-success",
  warning: "text-warning-text",
  info: "text-info",
} as const;

const SIZE_CLASSES = { sm: "text-sm", base: "text-base", lg: "text-lg" } as const;

const WEIGHT_CLASSES = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "label" | "strong" | "em" | "small";
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof TONE_CLASSES;
  weight?: keyof typeof WEIGHT_CLASSES;
}

/** Running text. A paragraph by default; `tone` uses semantic colour tokens. */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { as: Component = "p", size = "base", tone, weight, className, ...props },
  ref,
) {
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn(
        SIZE_CLASSES[size],
        tone && TONE_CLASSES[tone],
        weight && WEIGHT_CLASSES[weight],
        className,
      )}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------------------------

const UNDERLINE_CLASSES = {
  always: "underline",
  hover: "hover:underline focus-visible:underline",
  none: "no-underline",
} as const;

export interface LinkOwnProps {
  /**
   * `always` (default) keeps links distinguishable without relying on colour alone;
   * `hover` underlines on hover and focus; `none` removes it.
   */
  underline?: keyof typeof UNDERLINE_CLASSES;
  /** Opens in a new tab with `rel="noopener noreferrer"` and tells screen readers. */
  external?: boolean;
}

export type LinkProps<T extends ElementType = "a"> = LinkOwnProps & {
  /** Render a router link: `<Link as={NextLink} href="/x">`. */
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof LinkOwnProps | "as">;

function LinkImpl(
  {
    as: Component = "a",
    underline = "always",
    external,
    className,
    children,
    ...props
  }: LinkProps<ElementType>,
  ref: Ref<HTMLAnchorElement>,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        "rounded-sm font-medium text-primary underline-offset-4 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        UNDERLINE_CLASSES[underline],
        className,
      )}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
      {external && <span className="sr-only">(opens in a new tab)</span>}
    </Component>
  );
}

/** A link. Underlined by default, with a full-strength focus ring. Server-safe. */
export const Link = forwardRef(LinkImpl) as <T extends ElementType = "a">(
  props: LinkProps<T> & { ref?: Ref<HTMLAnchorElement> },
) => ReactElement | null;

// ---------------------------------------------------------------------------------------------

/** Inline code. */
export const Code = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(function Code(
  { className, ...props },
  ref,
) {
  return (
    <code
      ref={ref}
      className={cn(
        "rounded bg-muted px-[0.3em] py-[0.15em] font-mono text-[0.875em] text-foreground",
        className,
      )}
      {...props}
    />
  );
});

/** A keyboard key, for documenting shortcuts. */
export const Kbd = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(function Kbd(
  { className, ...props },
  ref,
) {
  return (
    <kbd
      ref={ref}
      className={cn(
        "rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
});

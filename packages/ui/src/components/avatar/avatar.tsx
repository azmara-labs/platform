import { Children, forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "../../lib/cn.js";
import { Avatar as AvatarPrimitive } from "../../primitives/avatar.js";

/**
 * Up to two initials from a name: the first character of the first two words, uppercased.
 * Counts whole characters (so a surrogate pair or an emoji is never cut in half).
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word: string) => Array.from(word)[0] ?? "";
  return words.slice(0, 2).map(first).join("").toLocaleUpperCase();
}

const SIZE = {
  sm: "size-6 text-[0.625rem]",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

const SHAPE = { circle: "rounded-full", square: "rounded-md" } as const;

export type AvatarSize = keyof typeof SIZE;

interface AvatarOwnProps {
  /** The image. When it fails to load (or is absent) the fallback is shown. */
  src?: string;
  size?: AvatarSize;
  shape?: keyof typeof SHAPE;
  /** What to show instead of the image. Default: the initials of `name`, or a placeholder. */
  fallback?: ReactNode;
  /** Wait this long before showing the fallback, to avoid a flash while the image loads. */
  delayMs?: number;
  className?: string;
}

/** An avatar must say who it is, or be explicitly decorative. */
type Identity =
  | { name: string; alt?: string; decorative?: boolean }
  | { alt: string; name?: string; decorative?: boolean }
  | { decorative: true; name?: string; alt?: string };

export type AvatarProps = AvatarOwnProps &
  Identity &
  Omit<HTMLAttributes<HTMLSpanElement>, keyof AvatarOwnProps | "role" | "aria-label">;

const AvatarImpl = forwardRef<
  HTMLSpanElement,
  AvatarOwnProps &
    Omit<HTMLAttributes<HTMLSpanElement>, keyof AvatarOwnProps> & {
      name?: string;
      alt?: string;
      decorative?: boolean;
    }
>(function Avatar(
  {
    src,
    name,
    alt,
    decorative = false,
    size = "md",
    shape = "circle",
    fallback,
    delayMs,
    className,
    ...props
  },
  ref,
) {
  const label = alt ?? name;
  return (
    <AvatarPrimitive.Root
      ref={ref as Ref<HTMLSpanElement>}
      // The avatar carries the name; the image inside is decorative so it is not announced twice.
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground",
        SIZE[size],
        SHAPE[shape],
        className,
      )}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt="" className="aspect-square size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback delay={delayMs} aria-hidden="true">
        {fallback ?? (name ? getInitials(name) : "?")}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});

/** A person or entity as an image with initials as the fallback. Requires a name, alt or `decorative`. */
export const Avatar = AvatarImpl as unknown as React.ForwardRefExoticComponent<
  AvatarProps & React.RefAttributes<HTMLSpanElement>
>;

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Show at most this many avatars, then a `+N` for the rest. */
  max?: number;
  /** The accessible name of the `+N` avatar. Default `N more`. */
  overflowLabel?: (hidden: number) => string;
  children?: ReactNode;
}

/** Overlapping avatars with a labelled `+N` for the rest. */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max, overflowLabel = (n) => `${n} more`, className, children, ...props },
  ref,
) {
  const all = Children.toArray(children);
  const visible = max === undefined ? all : all.slice(0, Math.max(0, max));
  const hidden = all.length - visible.length;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls; this groups images
    <div
      ref={ref}
      role="group"
      className={cn("flex -space-x-2 [&>*]:ring-2 [&>*]:ring-background", className)}
      {...props}
    >
      {visible}
      {hidden > 0 && <Avatar alt={overflowLabel(hidden)} fallback={`+${hidden}`} />}
    </div>
  );
});

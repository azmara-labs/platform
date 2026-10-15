import { type ComponentType, forwardRef, type SVGProps } from "react";
import { cn } from "../lib/cn.js";
import { getIcon, warnMissingIcon } from "./registry.js";
import type { IconProps, IconSize } from "./types.js";

/** Tailwind classes, spelled out in full so the scanner finds them in `dist`. */
export const iconSizes = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
  xl: "size-6",
} as const satisfies Record<Exclude<IconSize, number>, string>;

/**
 * Renders an icon component (Lucide, Tabler or your own SVG) with consistent size, stroke,
 * motion and accessibility. Server-safe: no hooks, no `"use client"`.
 *
 * Decorative by default; `aria-label` / `aria-labelledby` make it a labelled image.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    icon,
    name,
    size = "md",
    spin = false,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref,
) {
  const resolved = icon ?? (name === undefined ? undefined : getIcon(name));
  if (!resolved) {
    warnMissingIcon(name);
    return null;
  }
  // One cast: the icon components we accept take SVG props and a forwarded ref.
  const Component = resolved as unknown as ComponentType<SVGProps<SVGSVGElement>>;
  const labelled = Boolean(ariaLabel || ariaLabelledBy);
  const numeric = typeof size === "number";

  return (
    <Component
      ref={ref}
      className={cn(
        numeric ? undefined : iconSizes[size],
        "shrink-0",
        spin && "animate-spin",
        className,
      )}
      {...(numeric ? { width: size, height: size } : {})}
      {...(spin ? { "data-motion": "essential" } : {})}
      {...(labelled
        ? { role: "img", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }
        : { "aria-hidden": true })}
      {...props}
    />
  );
});

import type { IconNode } from "lucide";
import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  type SVGProps,
} from "react";

/** One Lucide icon's shapes (SVG element names and attributes), as the `lucide` package exports them. */
export type { IconNode };

/** The props Lucide's React icons accept, so a glyph drops in wherever one was used. */
export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  /** Width and height. Default 24. */
  size?: string | number;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  /** Default 2. */
  strokeWidth?: string | number;
  /** Keep the stroke width the same in screen pixels at any size. */
  absoluteStrokeWidth?: boolean;
}

export type Glyph = ForwardRefExoticComponent<GlyphProps & RefAttributes<SVGSVGElement>>;

const VIEWBOX_SIZE = 24;

/** `stroke-width` -> `strokeWidth`; `aria-*` and `data-*` stay as they are. */
const reactAttribute = (name: string) =>
  name.startsWith("aria-") || name.startsWith("data-")
    ? name
    : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const hasAccessibleProp = (props: Record<string, unknown>) =>
  Object.keys(props).some((key) => key.startsWith("aria-") || key === "role" || key === "title");

const pascal = (kebab: string) =>
  kebab.replace(/(^|-)([a-z0-9])/g, (_, __, letter: string) => letter.toUpperCase());

/**
 * Makes a Lucide icon from its shape data. lucide-react's own icons are client components (their
 * shared `Icon` reads a React context), so any page that renders one, even from a Server
 * Component, ships Lucide's runtime. A glyph renders the same `<svg>` with no hooks and no
 * `"use client"`, so it costs no JavaScript in the browser.
 *
 * The markup matches lucide-react's: the same attributes, the `lucide lucide-<name>` classes
 * (plus one per old name in `aliases`, as lucide-react adds),
 * and `aria-hidden` unless an accessible name or role is given.
 */
export function createGlyph(name: string, node: IconNode, aliases: readonly string[] = []): Glyph {
  const shapes = node.map(([tag, attributes], index) => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) props[reactAttribute(key)] = value;
    }
    return createElement(tag, { key: index, ...props });
  });

  // biome-ignore lint/correctness/noComponentHookFactories: a factory by design; callers build the component once, at module level
  const glyph = forwardRef<SVGSVGElement, GlyphProps>(function Glyph(
    {
      size = VIEWBOX_SIZE,
      color = "currentColor",
      strokeWidth = 2,
      absoluteStrokeWidth = false,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const classes = [
      "lucide",
      `lucide-${name}`,
      ...aliases.map((alias) => `lucide-${alias}`),
      ...(className?.split(" ") ?? []),
    ].filter((value, index, all) => value !== "" && all.indexOf(value) === index);
    return createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
        fill: "none",
        stroke: color,
        strokeWidth: absoluteStrokeWidth
          ? (Number(strokeWidth) * VIEWBOX_SIZE) / Number(size)
          : strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: classes.join(" "),
        ...(children || hasAccessibleProp(rest) ? {} : { "aria-hidden": "true" }),
        ...rest,
      },
      ...shapes,
      children,
    );
  });
  glyph.displayName = pascal(name);
  return glyph;
}

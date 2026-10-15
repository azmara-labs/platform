import type { ComponentType, SVGProps } from "react";

/** The size scale. A number is a literal pixel size (width and height). */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

/**
 * The props the Icon passes to the icon component it renders. Lucide, Tabler and plain
 * `(props: SVGProps<SVGSVGElement>) => <svg />` components all accept these, so any of them
 * can be used as an icon. Every prop is optional so the library components assign to it.
 */
export interface IconRenderProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  strokeWidth?: number | string;
  role?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "data-motion"?: string;
}

export type IconComponent = ComponentType<IconRenderProps>;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref" | "size" | "children"> {
  /** The icon to render: a Lucide or Tabler icon, or your own SVG component. */
  icon?: IconComponent;
  /** Looks the icon up in the registry (`registerIcons`). `icon` wins when both are given. */
  name?: string;
  /** `xs` .. `xl` follow the size tokens; a number is a pixel size. Default `md`. */
  size?: IconSize;
  /** Turns the icon into a loading indicator. It keeps spinning under reduced motion. */
  spin?: boolean;
  /**
   * Decorative by default (`aria-hidden`). Give `aria-label` or `aria-labelledby` to make the
   * icon meaningful: it then has `role="img"` and an accessible name.
   */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../lib/cn.js";

const NAMED_RATIOS = {
  square: "aspect-square",
  video: "aspect-video",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "21/9": "aspect-[21/9]",
  "3/4": "aspect-[3/4]",
} as const;

export type NamedRatio = keyof typeof NAMED_RATIOS;

export interface AspectRatioProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** A name (`square`, `video` (16/9), `4/3`, `3/2`, `21/9`, `3/4`) or a positive width-to-height number. Default `video`. */
  ratio?: NamedRatio | number;
  children?: ReactNode;
}

/** A box that keeps an aspect ratio. Direct `img`, `video` and `iframe` children fill it. Server-safe. */
export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(function AspectRatio(
  { ratio = "video", className, style, children, ...props },
  ref,
) {
  const named = typeof ratio === "string" && Object.hasOwn(NAMED_RATIOS, ratio);
  if (!named && !(typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0)) {
    throw new Error(
      `AspectRatio: ratio must be one of ${Object.keys(NAMED_RATIOS).join(", ")} or a positive number, got ${JSON.stringify(ratio)}`,
    );
  }
  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      className={cn(
        "relative w-full overflow-hidden",
        named ? NAMED_RATIOS[ratio as NamedRatio] : "aspect-(--azmr-ratio)",
        "[&>img]:h-full [&>img]:w-full [&>img]:object-cover",
        "[&>video]:h-full [&>video]:w-full [&>video]:object-cover",
        "[&>iframe]:h-full [&>iframe]:w-full",
        className,
      )}
      style={named ? style : ({ "--azmr-ratio": String(ratio), ...style } as CSSProperties)}
      {...props}
    >
      {children}
    </div>
  );
});

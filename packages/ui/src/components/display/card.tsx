import { forwardRef, type HTMLAttributes, type Ref } from "react";
import { cn } from "../../lib/cn.js";

type DivProps = HTMLAttributes<HTMLDivElement>;

/** A bordered surface for grouped content. Server-safe. */
export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-elevation-1",
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = forwardRef<HTMLDivElement, DivProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The heading level to render. Default `h3`; pick the one that fits the page outline. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "p";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { as: Component = "h3", className, ...props },
  ref,
) {
  return (
    <Component
      ref={ref as Ref<never>}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
});

export const CardDescription = forwardRef<HTMLDivElement, DivProps>(function CardDescription(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, DivProps>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, DivProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex items-center px-6 pb-6", className)} {...props} />;
});

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** A decorative icon or illustration above the title. */
  icon?: ReactNode;
  /** What the user can do about it, usually a Button. */
  action?: ReactNode;
  /** The heading level of the title, to fit the page outline. Default 3. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

/** What to show when there is nothing to show yet, with a way forward. Server-safe. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { title, description, icon, action, headingLevel = 3, className, ...props },
  ref,
) {
  const Title = `h${headingLevel}` as "h3";
  return (
    <div
      ref={ref}
      className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)}
      {...props}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <Title className="text-lg font-semibold tracking-tight text-foreground">{title}</Title>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
});

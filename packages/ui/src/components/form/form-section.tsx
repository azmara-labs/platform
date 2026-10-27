import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn.js";

export interface FormSectionProps
  extends Omit<ComponentPropsWithoutRef<"section">, "title" | "children"> {
  /** The section heading. It also names the section for screen reader landmark lists. */
  title: ReactNode;
  description?: ReactNode;
  /**
   * `2` lays the fields out in two columns once the section is wide enough (about 32rem). Give a
   * field `className="@lg:col-span-2"` to span both.
   * @default 1
   */
  columns?: 1 | 2;
  /**
   * `"aside"` puts the heading and description beside the fields once the section is wide
   * enough (about 48rem), the usual layout for a long settings page.
   * @default "stacked"
   */
  layout?: "stacked" | "aside";
  /**
   * The heading level, so the section fits the page's outline.
   * @default 2
   */
  headingLevel?: 2 | 3 | 4;
  children: ReactNode;
}

const HEADINGS = { 2: "h2", 3: "h3", 4: "h4" } as const;

/**
 * A titled part of a long form. Lays its fields out in one or two columns, and can put its
 * heading beside them. Columns respond to the section's own width (a container query), not the
 * viewport, so a section in a narrow card stays in one column.
 */
export const FormSection = forwardRef<HTMLElement, FormSectionProps>(function FormSection(
  {
    title,
    description,
    columns = 1,
    layout = "stacked",
    headingLevel = 2,
    className,
    children,
    ...props
  },
  ref,
) {
  const titleId = useId();
  const Heading = HEADINGS[headingLevel];

  return (
    <section ref={ref} aria-labelledby={titleId} className={cn("@container", className)} {...props}>
      <div
        className={cn(
          "grid gap-5",
          layout === "aside" && "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @3xl:gap-10",
        )}
      >
        <div className="flex flex-col gap-1">
          <Heading id={titleId} className="text-lg font-semibold leading-tight text-foreground">
            {title}
          </Heading>
          {description !== undefined ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className={cn("grid gap-5", columns === 2 && "@lg:grid-cols-2")}>{children}</div>
      </div>
    </section>
  );
});

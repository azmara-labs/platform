import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A link card for the landing page. Next prefetches the code of every route a visible <Link> points
 * to, and the docs routes carry the docs layout, so linking to them from the landing page would load
 * that code for visitors who may never open the docs. `prefetch={false}` loads it when they click.
 */
export function LandingCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex h-full flex-col gap-2 rounded-xl border border-fd-border bg-fd-card p-4 text-fd-card-foreground transition-colors hover:bg-fd-accent/80"
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="w-fit rounded-lg border border-fd-border bg-fd-muted p-1.5 text-fd-primary [&_svg]:size-5"
        >
          {icon}
        </span>
      ) : null}
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </Link>
  );
}

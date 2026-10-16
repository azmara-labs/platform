import Link from "next/link";

export function CtaFooter() {
  return (
    <section className="w-full bg-fd-card/40">
      <div className="flex flex-col items-center gap-6 px-8 py-20 text-center">
        <h2 className="text-2xl font-bold">Start with the reactive core, or the full stack.</h2>
        <p className="max-w-xl text-fd-muted-foreground">
          Every package installs independently. Bring in <code>@azmr/security</code> when you need
          the audit trail.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/docs/guide/introduction"
            className="rounded-md bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-fd-border px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}

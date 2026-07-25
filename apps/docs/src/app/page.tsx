import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center">
      <h1 className="text-4xl font-bold">Azmara Platform Documentation</h1>
      <p className="max-w-xl text-fd-muted-foreground">
        Reactive signals, queries, and security primitives for data-first applications — with docs
        that stay accurate against the real source, not hand-maintained prose.
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="rounded-md bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:opacity-90"
        >
          Read the docs
        </Link>
        <Link
          href="/docs/guide/introduction"
          className="rounded-md border border-fd-border px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
        >
          Getting started
        </Link>
      </div>
    </main>
  );
}

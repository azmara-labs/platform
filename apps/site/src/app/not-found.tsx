import "./landing.css";
import Link from "next/link";

// Styled by landing.css: the root layout has no stylesheet of its own.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fd-background px-8 text-center text-fd-foreground">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-fd-muted-foreground">That page does not exist, or it has moved.</p>
      <div className="flex gap-3">
        <Link
          prefetch={false}
          href="/docs"
          className="rounded-md bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground"
        >
          Read the docs
        </Link>
        <Link
          prefetch={false}
          href="/"
          className="rounded-md border border-fd-border px-5 py-2.5 text-sm font-medium"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

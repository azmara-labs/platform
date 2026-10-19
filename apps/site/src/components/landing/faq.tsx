import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "./landing-icons";

/**
 * One question. A native <details> element: it opens and closes with no JavaScript, is keyboard
 * and screen-reader accessible by default, and the shared `name` makes the browser keep one open at
 * a time, as the accordion this replaced did. It also keeps the answers in the page's HTML.
 */
function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details
      name="faq"
      className="group rounded-lg border border-fd-border bg-fd-card px-4 [&:not(:last-child)]:mb-2"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pb-4 text-sm text-fd-muted-foreground">{children}</div>
    </details>
  );
}

export function Faq() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-3xl px-8 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">FAQ</h2>
        <FaqItem question="Does everything in Azmara depend on the security package?">
          No. Only the persistence, policy, and AI packages (<code>@azmr/db</code>,{" "}
          <code>@azmr/db-supabase</code>, <code>@azmr/policycore</code>, <code>@azmr/ai</code>,{" "}
          <code>@azmr/cli</code>) depend on <code>@azmr/security</code>. The reactive core (
          <code>@azmr/core</code>, <code>@azmr/query</code>, <code>@azmr/ui</code>) has zero
          dependency on it and works standalone.
        </FaqItem>
        <FaqItem question="Is the built-in rate limiter distributed-safe?">
          No — <code>createRateLimiter</code> is an in-memory sliding window, documented as such.
          For multi-instance deployments, pair it with an external store rather than relying on it
          alone across processes.
        </FaqItem>
        <FaqItem question="How complete is the OWASP Top 10 coverage?">
          Partial, honestly. <code>@azmr/policycore</code>'s OWASP report currently evaluates 4 of
          the 10 2021 categories and ships its own disclaimer that it is not an audit, pentest, or
          certification. See{" "}
          <Link prefetch={false} href="/docs/security/overview" className="underline">
            the security overview
          </Link>{" "}
          for the full breakdown.
        </FaqItem>
        <FaqItem question="Why isolated-vm instead of vm2 for the AI sandbox?">
          <code>vm2</code> has known sandbox-escape CVEs. <code>@azmr/ai</code> uses{" "}
          <code>isolated-vm</code>'s real V8 isolate boundaries instead, with a 64MB memory limit
          and 5 second timeout per run. In production, if <code>isolated-vm</code> is unavailable it
          refuses to run rather than silently falling back to a weaker sandbox.
        </FaqItem>
      </div>
    </section>
  );
}

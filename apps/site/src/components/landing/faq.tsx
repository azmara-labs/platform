"use client";

import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import Link from "next/link";

export function Faq() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-3xl px-8 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">FAQ</h2>
        <Accordions type="single">
          <Accordion title="Does everything in Azmara depend on the security package?">
            No. Only the persistence, policy, and AI packages (<code>@azmr/db</code>,{" "}
            <code>@azmr/db-supabase</code>, <code>@azmr/policycore</code>, <code>@azmr/ai</code>,{" "}
            <code>@azmr/cli</code>) depend on <code>@azmr/security</code>. The reactive core (
            <code>@azmr/core</code>, <code>@azmr/query</code>, <code>@azmr/ui</code>) has zero
            dependency on it and works standalone.
          </Accordion>
          <Accordion title="Is the built-in rate limiter distributed-safe?">
            No — <code>createRateLimiter</code> is an in-memory sliding window, documented as such.
            For multi-instance deployments, pair it with an external store rather than relying on it
            alone across processes.
          </Accordion>
          <Accordion title="How complete is the OWASP Top 10 coverage?">
            Partial, honestly. <code>@azmr/policycore</code>'s OWASP report currently evaluates 4 of
            the 10 2021 categories and ships its own disclaimer that it is not an audit, pentest, or
            certification. See{" "}
            <Link href="/docs/security/overview" className="underline">
              the security overview
            </Link>{" "}
            for the full breakdown.
          </Accordion>
          <Accordion title="Why isolated-vm instead of vm2 for the AI sandbox?">
            <code>vm2</code> has known sandbox-escape CVEs. <code>@azmr/ai</code> uses{" "}
            <code>isolated-vm</code>'s real V8 isolate boundaries instead, with a 64MB memory limit
            and 5 second timeout per run. In production, if <code>isolated-vm</code> is unavailable
            it refuses to run rather than silently falling back to a weaker sandbox.
          </Accordion>
        </Accordions>
      </div>
    </section>
  );
}

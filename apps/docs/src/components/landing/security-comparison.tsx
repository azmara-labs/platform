"use client";

import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

export function SecurityComparison() {
  return (
    <section className="w-full bg-fd-card/40">
      <div className="mx-auto max-w-3xl px-8 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">What ships by default</h2>
        <p className="mb-8 text-center text-fd-muted-foreground">
          Reactivity and caching are a solved problem. Where the platform differs is what's already
          in the box when you also need auth, rate limiting, and an audit trail.
        </p>
        <Tabs items={["Azmara", "TanStack Query", "Convex"]}>
          <Tab value="Azmara">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                RBAC via <code>createAccessControl</code>, fail-closed by default
              </li>
              <li>
                SHA-256 hash-chained audit logging via <code>createAuditLogger</code>
              </li>
              <li>
                Rate limiting and CORS composed declaratively via <code>createPolicyEngine</code>
              </li>
              <li>All in the same monorepo as the reactive/data layer</li>
            </ul>
          </Tab>
          <Tab value="TanStack Query">
            <p>
              An excellent caching and sync layer for server state. It doesn't ship a first-party
              audit log, RBAC, or policy engine — those guarantees come from whatever backend or
              middleware you pair it with.
            </p>
          </Tab>
          <Tab value="Convex">
            <p>
              A strong reactive backend-as-a-service with built-in sync. Auth and access rules are
              handled through its own function-level checks; it doesn't provide a portable,
              standalone RBAC/audit-log/rate-limit primitive you can reuse outside its runtime.
            </p>
          </Tab>
        </Tabs>
        <Callout type="info" title="The honest split" className="mt-6">
          Every persistence, policy, and AI package (<code>@azmr/db</code>,{" "}
          <code>@azmr/db-supabase</code>, <code>@azmr/policycore</code>, <code>@azmr/ai</code>,{" "}
          <code>@azmr/cli</code>) depends on <code>@azmr/security</code>, directly or transitively.
          The reactive core (<code>@azmr/core</code>, <code>@azmr/query</code>,{" "}
          <code>@azmr/ui</code>) has zero dependency on it — use it standalone if that's all you
          need.
        </Callout>
      </div>
    </section>
  );
}

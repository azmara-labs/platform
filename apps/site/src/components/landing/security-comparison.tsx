import { InfoIcon } from "./landing-icons";

export function SecurityComparison() {
  return (
    <section className="w-full bg-fd-card/40">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">What ships by default</h2>
        <p className="mb-8 text-center text-fd-muted-foreground">
          Reactivity and caching are a solved problem. Where the platform differs is what's already
          in the box when you also need auth, rate limiting, and an audit trail.
        </p>
        {/* All three side by side rather than in tabs: easier to compare, and no client code. */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-card-foreground">
            <h3 className="mb-2 font-medium">Azmara</h3>
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
          </div>
          <div className="rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-card-foreground">
            <h3 className="mb-2 font-medium">TanStack Query</h3>
            <p>
              An excellent caching and sync layer for server state. It doesn't ship a first-party
              audit log, RBAC, or policy engine — those guarantees come from whatever backend or
              middleware you pair it with.
            </p>
          </div>
          <div className="rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-card-foreground">
            <h3 className="mb-2 font-medium">Convex</h3>
            <p>
              A strong reactive backend-as-a-service with built-in sync. Auth and access rules are
              handled through its own function-level checks; it doesn't provide a portable,
              standalone RBAC/audit-log/rate-limit primitive you can reuse outside its runtime.
            </p>
          </div>
        </div>
        {/* Fumadocs' Callout markup, without its lucide icons (they are client code; see landing-icons). */}
        <div
          className="mt-6 flex gap-2 rounded-xl border bg-fd-card p-3 ps-1 text-sm text-fd-card-foreground shadow-md"
          style={
            {
              "--callout-color": "var(--color-fd-info, var(--color-fd-muted))",
            } as React.CSSProperties
          }
        >
          <div role="none" className="w-0.5 rounded-sm bg-(--callout-color)/50" />
          <InfoIcon className="-me-0.5 size-5 fill-(--callout-color) text-fd-card" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="my-0! font-medium">The honest split</p>
            <div className="text-fd-muted-foreground">
              Every persistence, policy, and AI package (<code>@azmr/db</code>,{" "}
              <code>@azmr/db-supabase</code>, <code>@azmr/policycore</code>, <code>@azmr/ai</code>,{" "}
              <code>@azmr/cli</code>) depends on <code>@azmr/security</code>, directly or
              transitively. The reactive core (<code>@azmr/core</code>, <code>@azmr/query</code>,{" "}
              <code>@azmr/ui</code>) has zero dependency on it — use it standalone if that's all you
              need.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

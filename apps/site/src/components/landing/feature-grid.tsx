import { LandingCard } from "./landing-card";
import { DatabaseIcon, ShieldCheckIcon, ZapIcon } from "./landing-icons";

export function FeatureGrid() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <h2 className="sr-only">What the platform gives you</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <LandingCard
            icon={<ZapIcon />}
            title="Reactive core"
            description="Signals, effects, and computed values in @azmr/core, with a chainable query builder and UI components layered on top — no dependency on the security stack, usable standalone."
            href="/docs/guide/reactivity"
          />
          <LandingCard
            icon={<ShieldCheckIcon />}
            title="Security as architecture"
            description="@azmr/security sits at the root of the persistence, policy, and AI packages — RBAC, hash-chained audit logging, and JWT are the foundation, not an add-on."
            href="/docs/security/overview"
          />
          <LandingCard
            icon={<DatabaseIcon />}
            title="Local-first, typed end-to-end"
            description="@azmr/db persists to SQLite with parameterised queries and a tamper-evident audit log — swap in @azmr/db-supabase for hosted Postgres without changing calling code."
            href="/docs/packages/db"
          />
        </div>
      </div>
    </section>
  );
}

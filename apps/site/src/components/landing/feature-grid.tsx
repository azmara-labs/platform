import { Card, Cards } from "fumadocs-ui/components/card";
import { Database, ShieldCheck, Zap } from "lucide-react";

export function FeatureGrid() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <Cards>
          <Card
            icon={<Zap />}
            title="Reactive core"
            description="Signals, effects, and computed values in @azmr/core, with a chainable query builder and UI components layered on top — no dependency on the security stack, usable standalone."
            href="/docs/guide/reactivity"
          />
          <Card
            icon={<ShieldCheck />}
            title="Security as architecture"
            description="@azmr/security sits at the root of the persistence, policy, and AI packages — RBAC, hash-chained audit logging, and JWT are the foundation, not an add-on."
            href="/docs/security/overview"
          />
          <Card
            icon={<Database />}
            title="Local-first, typed end-to-end"
            description="@azmr/db persists to SQLite with parameterised queries and a tamper-evident audit log — swap in @azmr/db-supabase for hosted Postgres without changing calling code."
            href="/docs/packages/db"
          />
        </Cards>
      </div>
    </section>
  );
}

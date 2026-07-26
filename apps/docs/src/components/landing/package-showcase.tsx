import { Card, Cards } from "fumadocs-ui/components/card";

const packages = [
  {
    name: "@azmr/core",
    slug: "core",
    description: "Reactive engine — signals, effects, and computed values.",
  },
  {
    name: "@azmr/query",
    slug: "query",
    description: "Chainable, data-first query builder over arrays or reactive Signals.",
  },
  { name: "@azmr/ui", slug: "ui", description: "React components wired to reactive Signals." },
  {
    name: "@azmr/db",
    slug: "db",
    description: "Secure, async SQLite persistence adapter built on better-sqlite3.",
  },
  {
    name: "@azmr/security",
    slug: "security",
    description:
      "Shared security utilities — validation, RBAC, JWT, audit logging, sanitisation, and env guards.",
  },
  {
    name: "@azmr/policycore",
    slug: "policycore",
    description:
      "Security policy engine — rate limits, auth, CORS, request signing, secrets, API keys, and OWASP Top 10 reporting.",
  },
  {
    name: "@azmr/ai",
    slug: "ai",
    description: "AI auto-fix system with true V8 isolate sandboxing.",
  },
  { name: "@azmr/cli", slug: "cli", description: "Command-line tooling for the Azmara Platform." },
];

export function PackageShowcase() {
  return (
    <section className="w-full bg-fd-card/40">
      <div className="mx-auto max-w-5xl px-8 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Packages</h2>
        <Cards>
          {packages.map((pkg) => (
            <Card
              key={pkg.slug}
              title={pkg.name}
              description={pkg.description}
              href={`/docs/packages/${pkg.slug}`}
            />
          ))}
        </Cards>
      </div>
    </section>
  );
}

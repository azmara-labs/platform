import { StaticCodeBlock } from "./static-code-block";

const policyEngineCode = `const engine = createPolicyEngine({
  policies: {
    "invoices.read": {
      rateLimit: { options: { maxRequests: 100, windowMs: 60_000 }, keyedBy: "subject" },
      auth: { resource: "invoice", action: "read" },
      cors: { allowedOrigins: ["https://app.example.com"] },
    },
  },
  accessControl,
});`;

export function CodeShowcase() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-3xl px-8 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">Rate limits, auth, and CORS as code</h2>
        <p className="mb-8 text-center text-fd-muted-foreground">
          <code>@azmr/policycore</code> composes <code>@azmr/security</code>'s primitives — rate
          limit, then auth, then CORS — declared once per route.
        </p>
        <StaticCodeBlock lang="ts" code={policyEngineCode} />
      </div>
    </section>
  );
}

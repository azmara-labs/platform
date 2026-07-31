# @azmr/policycore

Standalone security layer for the Azmara platform: a policy engine (rate limits, auth requirements, and CORS as code), HMAC request signing for service-to-service calls, a local-env secrets manager, in-memory API key lifecycle management, a policy-aware static scan check, and OWASP Top 10 compliance report generation. Built on top of [`@azmr/security`](https://docs.azmara.io)'s `createRateLimiter`, `createAccessControl`, and `createAuditLogger` rather than reimplementing them.

## Install

```bash
pnpm add @azmr/policycore @azmr/security
# or
npm install @azmr/policycore @azmr/security
```

## Usage

```typescript
import { createAccessControl } from "@azmr/security";
import { createPolicyEngine } from "@azmr/policycore";

const accessControl = createAccessControl({
  policy: { admin: [{ resource: "reports", action: "read" }] },
});

const engine = createPolicyEngine({
  accessControl,
  policies: {
    "reports:read": {
      rateLimit: { options: { maxRequests: 100, windowMs: 60_000 } },
      auth: { resource: "reports", action: "read" },
      cors: { allowedOrigins: ["https://app.azmara.io"], allowCredentials: true },
    },
    "public:health": { cors: { allowedOrigins: "*" } },
  },
});

// --- at request time (any transport — Node http, Express, Next.js Route Handlers, etc.) ---
const result = await engine.evaluate("reports:read", {
  subject: { id: "u1", roles: ["admin"] },
  ip: req.socket.remoteAddress,
  origin: req.headers.origin,
});

if (!result.allowed) {
  res.statusCode = result.auth && !result.auth.can ? 403 : 429;
  res.end(result.reason);
} else {
  for (const [key, value] of Object.entries(result.cors?.headers ?? {})) {
    res.setHeader(key, value);
  }
  // ...handle the request
}
```

## How evaluation works

Each named policy declares up to three optional concerns, evaluated in order:

1. **Rate limit** — checked first (cheapest gate). Keyed by `context.subject.id` by default, falling back to `context.ip`, or a custom `keyedBy` function. Missing both throws — never silently falls back to a shared bucket.
2. **Auth** — an `{resource, action}` requirement checked against the shared `AccessControl` instance you pass in. Denial short-circuits before CORS is evaluated.
3. **CORS** — evaluated last, and is **advisory, not a hard gate**: `result.allowed` reflects only rate-limit + auth outcomes. `result.cors.allowed === false` just means "don't emit `Access-Control-Allow-Origin`" — matching how CORS actually works (browser-enforced via response headers, not a server-side authorization decision). Check `result.cors?.allowed` yourself if you want a hard server-side block too.

Omitting a concern from a policy definition skips it entirely — `result.rateLimit`/`result.auth`/`result.cors` stay `undefined`.

## Request signing

HMAC-SHA256 signing for service-to-service calls, with a timestamp tolerance window against replay and opt-in nonce tracking:

```typescript
import { createRequestSigner } from "@azmr/policycore";

const signer = createRequestSigner(process.env.SERVICE_SIGNING_SECRET!);
const header = signer.sign({ method: "POST", path: "/internal/sync", body });
// send header as e.g. X-Azmara-Signature

// on the receiving service:
const { timestamp, nonce } = signer.verify(header, { method: "POST", path: "/internal/sync", body });
```

`verify()` throws on any failure (invalid signature, expired timestamp, malformed header) — wrap it in `try/catch` at your request boundary.

## Secrets

A backend-agnostic secrets interface, shipping one adapter (local env) behind a swappable seam:

```typescript
import { createLocalEnvSecretsAdapter, createSecretsManager } from "@azmr/policycore";

const secrets = createSecretsManager({ adapter: createLocalEnvSecretsAdapter() });
const apiKey = await secrets.get("STRIPE_SECRET_KEY", { required: true }); // throws if unset
```

A future Doppler/AWS SSM adapter implements the same `SecretsAdapter` interface — no breaking change to callers.

## API key lifecycle

In-memory issue/rotate/revoke/verify, matching `createRateLimiter`'s "not distributed-safe" precedent:

```typescript
import { createApiKeyManager } from "@azmr/policycore";

const keys = createApiKeyManager();
const issued = keys.issue("ci-bot"); // { rawKey, keyId, ... } — rawKey shown exactly once
keys.verify(issued.rawKey); // { valid: true, keyId, label }
keys.rotate(issued.keyId); // old key invalidated immediately by default
keys.revoke(issued.keyId);
```

## Policy-aware static scan

`scanSourceForPolicyIssues` flags likely-hardcoded CORS misconfigurations (`allowedOrigins: "*"` + `allowCredentials: true`) in source, before deploy — the same combination `validateCorsPolicy` rejects at runtime. Intended to be composed by a project-wide scanner (see the `azmara policycore:scan` CLI command in `@azmr/cli`), not run standalone.

## OWASP Top 10 compliance report

Maps aggregated static-analysis findings onto the OWASP Top 10 (2021) categories, with an explicit honesty mechanism: a category is either `"not-evaluated"` (no rule covers it — absence of findings is not evidence of absence), `"no-findings"`, or `"findings-present"`. Never presents a clean report as a certification.

```typescript
import { generateOwaspReport, formatOwaspReportMarkdown, flattenAnalyzerResults } from "@azmr/policycore";

const findings = flattenAnalyzerResults(analyzerResults); // e.g. from @azmr/ai's analyzeSource, run per file
const report = generateOwaspReport(findings, { totalFilesScanned: 42 });
console.log(formatOwaspReportMarkdown(report));
```

## API

| Export | Description |
|---|---|
| `createPolicyEngine(options)` | Builds the engine from a map of named `PolicyDefinition`s. Returns `{ evaluate, resetRateLimit }`. |
| `definePolicy(def)` | `defineConfig`-style identity helper for literal-type inference when policies are split across files. |
| `evaluateCors(policy, origin)` | Pure CORS evaluation — usable standalone, no policy engine required. |
| `validateCorsPolicy(policy)` | Throws on an invalid CORS config (e.g. `allowCredentials` + `allowedOrigins: "*"`). |
| `createRequestSigner(secret, options?)` | HMAC-SHA256 request signing. Returns `{ sign, verify, resetNonces }`. |
| `createLocalEnvSecretsAdapter(options?)` / `createSecretsManager(options)` | Backend-agnostic secrets retrieval with optional caching. |
| `createApiKeyManager(options?)` | In-memory API key issue/rotate/revoke/verify/list. |
| `scanSourceForPolicyIssues(filePath, source)` | Flags CORS wildcard-with-credentials misconfigurations in source. |
| `generateOwaspReport(findings, options?)` / `formatOwaspReportMarkdown(report)` / `formatOwaspReportJson(report)` | OWASP Top 10 compliance report generation and rendering. |
| `flattenAnalyzerResults(results)` | Adapts a `{filePath, findings}[]` shape (e.g. `@azmr/ai`'s `analyzeSource` output) into the flat findings shape `generateOwaspReport` expects. |

## What this package deliberately doesn't do (yet)

- No Express/Fastify/Next.js middleware adapter — everything here takes and returns plain data, since no HTTP framework is standardized on across Azmara apps yet. A framework adapter is a natural follow-up once a real consumer exists.
- No subdomain-wildcard CORS matching beyond an explicit `"*.example.com"` entry — supply a predicate function (`allowedOrigins: (origin) => boolean`) for anything more elaborate.
- No durable/distributed storage for API keys or rate limits — both are in-memory, single-process, matching `@azmr/security`'s `createRateLimiter` precedent. Wire your own persistence via the documented seams if you need it.
- No Doppler/AWS SSM secrets adapter yet — local env only. Same `SecretsAdapter` interface, implement it when needed.
- No `azmara policycore:scan` CLI command lives in this package — that's in `@azmr/cli`, composing `scanSourceForPolicyIssues` and `@azmr/ai`'s `analyzeSource`.
- No auto-detection of a project's live `@azmr/policycore` configuration for the OWASP report — `configSignals` accepts pre-computed pass/fail facts only; introspecting a running `PolicyEngine` is a future v2.

## Requirements

- Node.js ≥ 18
- `@azmr/security` (peer, for `createRateLimiter`/`createAccessControl`)
- ESM only — no CommonJS build. `require("@azmr/policycore")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)

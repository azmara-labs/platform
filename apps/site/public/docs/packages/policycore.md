# @azmr/policycore

> Security policy engine — rate limits, auth, CORS, request signing, secrets, API keys, and OWASP Top 10 reporting.

Source: https://platform.azmara.io/docs/packages/policycore

`@azmr/policycore` is a standalone security layer built on top of `@azmr/security`'s `createRateLimiter`, `createAccessControl`, and `createAuditLogger` — it composes them rather than reimplementing them.

## Installation

```bash
pnpm add @azmr/policycore
```

## Policy engine

Composes rate limiting, an RBAC auth requirement, and CORS as code into one per-route `evaluate()` call.

```typescript
import { createPolicyEngine } from "@azmr/policycore";
import { createAccessControl } from "@azmr/security";

const engine = createPolicyEngine({
  accessControl: createAccessControl({ policy: { admin: [{ resource: "reports", action: "read" }] } }),
  policies: {
    "reports:read": {
      rateLimit: { options: { maxRequests: 100, windowMs: 60_000 } },
      auth: { resource: "reports", action: "read" },
      cors: { allowedOrigins: ["https://app.azmara.io"] },
    },
  },
});

const result = await engine.evaluate("reports:read", {
  subject: { id: "u1", roles: ["admin"] },
  origin: "https://app.azmara.io",
});
// result.allowed, result.rateLimit, result.auth, result.cors
```

| Prop            | Type                                                                                                                | Default | Required | Description                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `policies`      | `Record<string, object>`                                                                                            |         | Yes      |                                                                             |
| `accessControl` | `{ can(subject: AccessControlSubject \| null, query: AccessCheckQuery): Promise<AccessCheckResult>; } \| undefined` |         | No       | Required if any policy declares `auth` — validated eagerly at construction. |
| `onDecision`    | `((event: PolicyDecisionEvent) => void) \| undefined`                                                               |         | No       |                                                                             |

## Request signing

HMAC-SHA256 request signing for service-to-service calls, with a timestamp tolerance window and opt-in nonce replay tracking.

```typescript
import { createRequestSigner } from "@azmr/policycore";

const signer = createRequestSigner(process.env.REQUEST_SIGNING_SECRET!);

const header = signer.sign({ method: "POST", path: "/webhooks/ingest", body: rawBody });
// -> "t=<unix>,n=<hex>,v1=<hex>", send as a header alongside the request

signer.verify({ method: "POST", path: "/webhooks/ingest", body: rawBody, header });
// throws on any mismatch, expiry, or replay
```

| Prop               | Type                   | Default | Required | Description                                                                    |
| ------------------ | ---------------------- | ------- | -------- | ------------------------------------------------------------------------------ |
| `toleranceSeconds` | `number`               |         | No       | Timestamp tolerance window in seconds. Defaults to 300 (5 min).                |
| `trackNonces`      | `boolean \| undefined` |         | No       | Opt-in in-memory nonce replay tracking. Off by default. See doc comment below. |

## Secrets

Backend-agnostic secrets retrieval — a local-env adapter ships out of the box, with optional caching.

```typescript
import { createLocalEnvSecretsAdapter, createSecretsManager } from "@azmr/policycore";

const secrets = createSecretsManager({
  adapter: createLocalEnvSecretsAdapter(),
  cacheTtlMs: 60_000,
});

const apiKey = await secrets.get("STRIPE_API_KEY");
```

## API keys

Issue/rotate/revoke/verify lifecycle with hashed storage and timing-safe comparison — the raw key is only ever returned once, at issue time.

```typescript
import { createApiKeyManager } from "@azmr/policycore";

const manager = createApiKeyManager();

const issued = manager.issue("CI pipeline");
// issued.rawKey — store this now, it's never retrievable again

const result = manager.verify(issued.rawKey);
// { valid: true, keyId, label }
```

| Prop     | Type     | Default | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | -------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pepper` | `string` |         | No       | Optional HMAC pepper. Unlike createJWT's secret (the entire security mechanism) or createColumnEncryption's secret (no secret, no confidentiality), an API key's security already comes from 256 bits of crypto.randomBytes entropy in the secret itself — a pepper here is defense-in-depth only (a leak of the in-memory hash store alone, without the pepper, still isn't directly useful), not load-bearing. Omitting it is not insecure. |

## Static scan & OWASP reporting

`scanSourceForPolicyIssues` flags misconfigurations (e.g. CORS wildcard-with-credentials) directly in source. `generateOwaspReport` maps findings onto OWASP Top 10 (2021) categories with an explicit honesty mechanism — every category is `"not-evaluated"`, `"no-findings"`, or `"findings-present"`, so a clean report is never presented as a certification.

The `azmara policycore:scan` CLI command (see [`@azmr/cli`](https://platform.azmara.io/docs/packages/cli.md)) runs both together against a whole project.

## API Reference

| Export                                                                     | Description                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `createPolicyEngine(options)`                                              | Compose rate limit + auth + CORS into one `evaluate()` call |
| `createRequestSigner(secret, options?)`                                    | HMAC-SHA256 request signing with replay protection          |
| `createLocalEnvSecretsAdapter(options?)` / `createSecretsManager(options)` | Backend-agnostic secrets retrieval                          |
| `createApiKeyManager(options?)`                                            | API key issue/rotate/revoke/verify                          |
| `scanSourceForPolicyIssues(filePath, source)`                              | Flag policy misconfigurations in source                     |
| `generateOwaspReport(findings, options?)`                                  | OWASP Top 10 (2021) compliance report                       |
| `formatOwaspReportMarkdown(report)` / `formatOwaspReportJson(report)`      | Render a report                                             |

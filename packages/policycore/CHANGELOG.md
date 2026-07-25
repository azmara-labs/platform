# @azmr/policycore

## 0.2.0

### Minor Changes

- c4f2c02: Initial release of `@azmr/policycore` — a standalone security layer for the
  Azmara platform, built on top of `@azmr/security`'s `createRateLimiter`,
  `createAccessControl`, and `createAuditLogger` rather than reimplementing
  them:

  - `createPolicyEngine` — composes rate limiting, an RBAC auth requirement,
    and CORS as code into one per-route `evaluate()` call.
  - `evaluateCors`/`validateCorsPolicy` — pure, framework-agnostic CORS
    evaluation.
  - `createRequestSigner` — HMAC-SHA256 request signing for service-to-service
    calls, with a timestamp tolerance window and opt-in nonce replay tracking.
  - `createLocalEnvSecretsAdapter`/`createSecretsManager` — backend-agnostic
    secrets retrieval, local-env adapter shipped now, optional caching.
  - `createApiKeyManager` — in-memory API key issue/rotate/revoke/verify,
    hashed storage, timing-safe comparison.
  - `scanSourceForPolicyIssues` — flags CORS wildcard-with-credentials
    misconfigurations in source.
  - `generateOwaspReport`/`formatOwaspReportMarkdown`/`formatOwaspReportJson` —
    OWASP Top 10 (2021) compliance reporting with an explicit honesty
    mechanism: categories are `"not-evaluated"`, `"no-findings"`, or
    `"findings-present"` — a clean report is never presented as a
    certification.

### Patch Changes

- Updated dependencies [c4f2c02]
  - @azmr/security@0.3.0

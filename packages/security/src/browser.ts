/**
 * Browser-safe entry point — no Node.js built-ins.
 *
 * createJWT is deliberately NOT re-exported here: it uses node:crypto's
 * synchronous HMAC/timingSafeEqual APIs, which have no browser equivalent.
 * A browser-safe version would need to move to the async Web Crypto API
 * (crypto.subtle), which changes sign()/verify() from sync to async - a
 * breaking change to the existing API, not something to do silently as
 * part of splitting entry points. Track separately if client-side JWT
 * verification is actually needed.
 *
 * createAuditLogger is excluded for the same reason as always - it uses
 * node:fs/node:path/node:crypto to write to disk. validateEnv is excluded
 * too (lives in its own validate-env.ts, not validate.ts) - it reads
 * process.env directly, a Node global with no browser equivalent that
 * throws ReferenceError if actually called, not something a static import
 * check alone can catch. Its own doc comment says "call this once at the
 * entry point of each app/service" - a server-startup guard by design.
 */
/**
 * createAccessControl is browser-safe (no Node built-ins) and included here
 * deliberately - client-side can() checks are useful for UX gating (hiding
 * a button a user can't use). They are NEVER a security boundary on their
 * own - always re-check server-side.
 */
export type {
  AccessCheckQuery,
  AccessCheckResult,
  AccessControl,
  AccessControlOptions,
  AccessControlSubject,
  Policy,
  PolicyRule,
} from "./access-control.js";
export { createAccessControl } from "./access-control.js";
export type { RateLimiter, RateLimitOptions, RateLimitResult } from "./rateLimit.js";
export { createRateLimiter } from "./rateLimit.js";
export { assertSafeIdentifier, sanitiseForLog } from "./sanitise.js";
export { validate, z } from "./validate.js";

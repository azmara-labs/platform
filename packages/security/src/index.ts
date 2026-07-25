/**
 * Full entry point — includes Node.js-only utilities (createAuditLogger,
 * assertSafePath). For a browser/edge-safe subset, import from
 * "@azmr/security/browser" instead.
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
export type { AuditLogger } from "./audit.js";
export { createAuditLogger } from "./audit.js";
export type { JWT, JWTOptions, JWTPayload } from "./jwt.js";
export { createJWT } from "./jwt.js";
export { assertSafePath } from "./path-safety.js";
export type { RateLimiter, RateLimitOptions, RateLimitResult } from "./rateLimit.js";
export { createRateLimiter } from "./rateLimit.js";
export { assertSafeIdentifier, sanitiseForLog } from "./sanitise.js";
export { validate, z } from "./validate.js";
export { validateEnv } from "./validate-env.js";

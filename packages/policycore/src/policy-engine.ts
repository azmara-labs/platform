import type {
  AccessCheckResult,
  AccessControl,
  AccessControlSubject,
  RateLimitOptions,
  RateLimitResult,
} from "@azmr/security";
import { createRateLimiter } from "@azmr/security";
import type { CorsPolicy, CorsResult } from "./cors.js";
import { evaluateCors, validateCorsPolicy } from "./cors.js";

/**
 * A named bundle of security concerns for one route/resource — the unit
 * `@azmr/policycore` composes. NOTE: this is a different concept from
 * `@azmr/security`'s exported `Policy` type (an RBAC role -> rules grant
 * map) — this package never exports a bare `Policy` name to avoid that
 * collision.
 */
export interface AuthRequirement {
  resource: string;
  action: string;
  /** Derives the params passed to the underlying AccessControl check. Defaults to context.params. */
  paramsFromContext?: (context: PolicyEvaluationContext) => Record<string, unknown> | undefined;
}

export interface PolicyDefinition {
  /** Own createRateLimiter instance, built eagerly at construction. Omit to skip rate limiting. */
  rateLimit?: {
    options: RateLimitOptions;
    /**
     * How to derive the rate-limit bucket key. "subject" (default) uses
     * context.subject.id, falling back to context.ip. "ip" uses context.ip
     * only. A function receives the full context. Missing both when
     * required throws — never silently falls back to a shared bucket.
     */
    keyedBy?: "subject" | "ip" | ((context: PolicyEvaluationContext) => string);
  };
  /** RBAC requirement, checked against the engine's shared AccessControl. Omit for a public policy. */
  auth?: AuthRequirement;
  /** CORS rule. Omit to skip CORS evaluation (result.cors stays undefined). */
  cors?: CorsPolicy;
}

export interface PolicyEngineOptions {
  policies: Record<string, PolicyDefinition>;
  /** Required if any policy declares `auth` — validated eagerly at construction. */
  accessControl?: AccessControl;
  onDecision?: (event: PolicyDecisionEvent) => void;
}

export interface PolicyEvaluationContext {
  subject?: AccessControlSubject | null;
  ip?: string;
  origin?: string;
  params?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  rateLimit?: RateLimitResult;
  auth?: AccessCheckResult;
  cors?: CorsResult;
}

export interface PolicyDecisionEvent {
  name: string;
  context: PolicyEvaluationContext;
  result: PolicyEvaluationResult;
}

/**
 * Composes @azmr/security's createRateLimiter and createAccessControl into
 * one per-route evaluation call, plus a framework-agnostic CORS check.
 *
 * Evaluation order: rate limit first (cheapest gate — no reason to run an
 * RBAC/DB-resolve check for an already-over-limit request), then auth, then
 * CORS. CORS is advisory, not a hard gate on `result.allowed` — a denied
 * CORS result just means "don't emit Access-Control-Allow-Origin"; that
 * matches how CORS actually works (browser-enforced via response headers).
 */
export function createPolicyEngine(options: PolicyEngineOptions) {
  const { policies, accessControl, onDecision } = options;
  const limiters = new Map<string, ReturnType<typeof createRateLimiter>>();

  for (const [name, def] of Object.entries(policies)) {
    if (def.auth && !accessControl) {
      throw new Error(
        `[azmr/policycore] policy "${name}" declares an auth requirement but no accessControl was provided to createPolicyEngine`,
      );
    }
    if (def.cors) validateCorsPolicy(def.cors);
    if (def.rateLimit) limiters.set(name, createRateLimiter(def.rateLimit.options));
  }

  return {
    async evaluate(
      name: string,
      context: PolicyEvaluationContext,
    ): Promise<PolicyEvaluationResult> {
      const def = policies[name];
      if (!def) throw new Error(`[azmr/policycore] unknown policy "${name}"`);

      let rateLimit: RateLimitResult | undefined;
      if (def.rateLimit) {
        // biome-ignore lint/style/noNonNullAssertion: set for every def.rateLimit at construction
        const limiter = limiters.get(name)!;
        const key = resolveKey(def.rateLimit.keyedBy ?? "subject", context, name);
        rateLimit = limiter.check(key);
        if (!rateLimit.allowed) {
          const result: PolicyEvaluationResult = {
            allowed: false,
            reason: `Rate limit exceeded for policy "${name}"`,
            rateLimit,
          };
          onDecision?.({ name, context, result });
          return result;
        }
      }

      let auth: AccessCheckResult | undefined;
      if (def.auth) {
        // biome-ignore lint/style/noNonNullAssertion: validated at construction — auth requires accessControl
        auth = await accessControl!.can(context.subject ?? null, {
          resource: def.auth.resource,
          action: def.auth.action,
          params: def.auth.paramsFromContext?.(context) ?? context.params,
        });
        if (!auth.can) {
          const result: PolicyEvaluationResult = {
            allowed: false,
            reason: auth.reason ?? `Not authorized for policy "${name}"`,
            rateLimit,
            auth,
          };
          onDecision?.({ name, context, result });
          return result;
        }
      }

      const cors = def.cors ? evaluateCors(def.cors, context.origin) : undefined;

      const result: PolicyEvaluationResult = { allowed: true, rateLimit, auth, cors };
      onDecision?.({ name, context, result });
      return result;
    },

    resetRateLimit(name: string, key?: string): void {
      const limiter = limiters.get(name);
      if (!limiter) return;
      if (key) limiter.reset(key);
      else limiter.resetAll();
    },
  };
}

function resolveKey(
  keyedBy: NonNullable<PolicyDefinition["rateLimit"]>["keyedBy"],
  context: PolicyEvaluationContext,
  policyName: string,
): string {
  if (typeof keyedBy === "function") return keyedBy(context);
  if (keyedBy === "ip") {
    if (!context.ip) {
      throw new Error(
        `[azmr/policycore] policy "${policyName}" is keyed by ip but context.ip was not provided`,
      );
    }
    return context.ip;
  }
  const key = context.subject?.id ?? context.ip;
  if (!key) {
    throw new Error(
      `[azmr/policycore] policy "${policyName}" requires context.subject.id or context.ip to key rate limiting (or a custom keyedBy function)`,
    );
  }
  return key;
}

/** defineConfig-style identity helper for literal-type inference when policies are split across files. */
export function definePolicy(def: PolicyDefinition): PolicyDefinition {
  return def;
}

export type PolicyEngine = ReturnType<typeof createPolicyEngine>;

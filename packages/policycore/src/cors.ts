/**
 * Pure, framework-agnostic CORS evaluation — no Express/Fastify/Next.js
 * dependency. Deliberately conservative: no HTTP framework is wired into
 * any Azmara app yet, so this is a data-in/data-out primitive rather than
 * middleware for a specific stack.
 *
 * Deliberate v1 simplifications:
 * - Exact-string origin matching only — no subdomain wildcards beyond the
 *   explicit "*.example.com" form. A caller needing more supplies a
 *   predicate function.
 * - One function covers both preflight and actual-response header sets —
 *   harmless per spec, since browsers ignore the extra headers on a
 *   non-preflight response.
 */

export interface CorsPolicy {
  /**
   * "*" reflects any origin (only valid when allowCredentials is not true —
   * see validateCorsPolicy). An array is matched by exact string equality,
   * or a "*.example.com" wildcard entry matches subdomains only (never the
   * bare parent domain). A function is a custom predicate; a throw inside
   * it is treated as "not matched" (fail closed).
   */
  allowedOrigins: "*" | string[] | ((origin: string) => boolean);
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  allowCredentials?: boolean;
  maxAgeSeconds?: number;
}

export interface CorsResult {
  allowed: boolean;
  headers: Record<string, string>;
  reason?: string;
}

const DEFAULT_METHODS = ["GET", "POST"];

/** Throws on invalid CORS configuration. Call once, at policy-definition time. */
export function validateCorsPolicy(policy: CorsPolicy): void {
  if (policy.allowCredentials && policy.allowedOrigins === "*") {
    throw new Error(
      '[azmr/policycore] CORS policy is invalid: allowCredentials cannot be combined with allowedOrigins: "*" (reflects every origin with credentials enabled — a common CORS misconfiguration)',
    );
  }
}

function originMatches(allowed: CorsPolicy["allowedOrigins"], origin: string): boolean {
  if (allowed === "*") return true;
  if (typeof allowed === "function") {
    try {
      return allowed(origin);
    } catch {
      return false;
    }
  }
  return allowed.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // ".example.com"
      return origin.endsWith(suffix) && origin.length > suffix.length;
    }
    return entry === origin;
  });
}

/**
 * Evaluates a CorsPolicy against an incoming Origin header value.
 * CORS is advisory here, not a hard gate — a denied result just means
 * "don't emit Access-Control-Allow-Origin"; a browser enforces the actual
 * restriction client-side by reading the response headers. Callers who
 * want a hard server-side block on non-allowlisted origins can check
 * `result.allowed` themselves.
 */
export function evaluateCors(policy: CorsPolicy, origin: string | undefined | null): CorsResult {
  // No Origin header => not a cross-origin browser request; nothing to add.
  if (!origin) return { allowed: true, headers: {} };

  const varies = policy.allowedOrigins !== "*";
  const matched = originMatches(policy.allowedOrigins, origin);

  if (!matched) {
    return {
      allowed: false,
      // Vary: Origin on the unmatched path too, to avoid cross-origin cache poisoning.
      headers: varies ? { Vary: "Origin" } : {},
      reason: `Origin "${origin}" is not permitted by this CORS policy`,
    };
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin":
      policy.allowedOrigins === "*" && !policy.allowCredentials ? "*" : origin,
    "Access-Control-Allow-Methods": (policy.allowedMethods ?? DEFAULT_METHODS).join(", "),
  };
  if (varies) headers.Vary = "Origin";
  if (policy.allowCredentials) headers["Access-Control-Allow-Credentials"] = "true";
  if (policy.allowedHeaders?.length) {
    headers["Access-Control-Allow-Headers"] = policy.allowedHeaders.join(", ");
  }
  if (policy.exposedHeaders?.length) {
    headers["Access-Control-Expose-Headers"] = policy.exposedHeaders.join(", ");
  }
  if (policy.maxAgeSeconds !== undefined) {
    headers["Access-Control-Max-Age"] = String(policy.maxAgeSeconds);
  }

  return { allowed: true, headers };
}

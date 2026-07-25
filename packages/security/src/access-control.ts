import { sanitiseForLog } from "./sanitise.js";

export interface AccessCheckQuery {
  /** The resource being accessed, e.g. "invoice" or "*" (any resource — rarely used at the call site). */
  resource: string;
  /** The action being performed, e.g. "read" or "*" (any action — rarely used at the call site). */
  action: string;
  /** Optional record-level params, passed through to any matching rule's condition. */
  params?: Record<string, unknown>;
}

export interface AccessCheckResult {
  can: boolean;
  reason?: string;
}

export interface AccessControlSubject {
  /** Optional subject identifier, e.g. a user ID. */
  id?: string;
  /** Role names held by the subject — the key used to look up policy rules. */
  roles: string[];
  /**
   * Additional claims/attributes. Deliberately structurally compatible with
   * JWTPayload (jwt.ts) — both have a permissive index signature — so a
   * decoded JWT can be passed straight through as a subject without this
   * module importing jwt.ts (which pulls in node:crypto and would break
   * browser-safety).
   */
  [key: string]: unknown;
}

export interface PolicyRule {
  /** Resource this rule applies to, or "*" to match any resource. */
  resource: string;
  /** Action this rule applies to, or "*" to match any action. */
  action: string;
  /**
   * Optional record-level condition (e.g. ownership: "can THIS user delete
   * THIS invoice?"). Returning false skips this rule — evaluation continues
   * to the next matching rule rather than failing the whole check. A thrown
   * error is treated as false (fail closed).
   */
  condition?: (subject: AccessControlSubject | null, params?: Record<string, unknown>) => boolean;
}

/** Role name -> granted rules. Role "*" applies to every subject, including anonymous (subject === null). */
export type Policy = Record<string, PolicyRule[]>;

export interface AccessControlOptions {
  /** Static in-memory policy. */
  policy?: Policy;
  /**
   * Optional resolver for dynamic/DB-backed checks, consulted only when the
   * static policy does not already grant access. This is the seam a caller
   * uses to back checks with a Supabase RPC, a policy table, or anything
   * else — @azmr/security never imports a DB client itself.
   *
   * Example (not part of this package — shown for callers):
   *
   *   const ac = createAccessControl({
   *     resolve: async (subject, query) => {
   *       if (!subject?.id) return false;
   *       const { data: role } = await supabase.rpc("get_my_role");
   *       const { data: allowed } = await supabase
   *         .from("access_policies")
   *         .select("id")
   *         .eq("role", role)
   *         .eq("resource", query.resource)
   *         .eq("action", query.action)
   *         .maybeSingle();
   *       return !!allowed;
   *     },
   *   });
   */
  resolve?: (
    subject: AccessControlSubject | null,
    query: AccessCheckQuery,
  ) => Promise<AccessCheckResult | boolean> | AccessCheckResult | boolean;
  /** What to return when neither policy nor resolve decide. Defaults to "deny" (fail closed). */
  defaultEffect?: "allow" | "deny";
  /** Optional hook fired after every decision — wire this to createAuditLogger if you want checks audited. */
  onDecision?: (event: {
    subject: AccessControlSubject | null;
    query: AccessCheckQuery;
    result: AccessCheckResult;
    source: "policy" | "resolve" | "default";
  }) => void;
}

/**
 * Framework- and backend-agnostic RBAC primitive: {resource, action, params} -> {can, reason}.
 *
 * Client-side `can()` checks are UX convenience only (e.g. hiding a button) —
 * never a security boundary. Always re-check server-side.
 *
 * No third-party dependencies. Purely additive grant model — a rule grants
 * or is silent, nothing revokes — which keeps evaluation simple and auditable.
 */
export function createAccessControl(options: AccessControlOptions = {}) {
  const { policy = {}, resolve, defaultEffect = "deny", onDecision } = options;

  return {
    async can(
      subject: AccessControlSubject | null,
      query: AccessCheckQuery,
    ): Promise<AccessCheckResult> {
      if (!query.resource || !query.action) {
        throw new Error("[azmara/security] resource and action are required");
      }

      const roleKeys = ["*", ...(subject?.roles ?? [])];

      for (const roleKey of roleKeys) {
        const rules = policy[roleKey];
        if (!rules) continue;

        for (const rule of rules) {
          const matchesResource = rule.resource === "*" || rule.resource === query.resource;
          const matchesAction = rule.action === "*" || rule.action === query.action;
          if (!matchesResource || !matchesAction) continue;

          let granted = true;
          if (rule.condition) {
            try {
              granted = rule.condition(subject, query.params);
            } catch {
              granted = false;
            }
          }

          if (granted) {
            const result: AccessCheckResult = { can: true };
            onDecision?.({ subject, query, result, source: "policy" });
            return result;
          }
        }
      }

      if (resolve) {
        let resolved: AccessCheckResult | boolean;
        try {
          resolved = await resolve(subject, query);
        } catch {
          resolved = false;
        }
        const result: AccessCheckResult =
          typeof resolved === "boolean" ? { can: resolved } : resolved;
        onDecision?.({ subject, query, result, source: "resolve" });
        return result;
      }

      const result: AccessCheckResult = {
        can: defaultEffect === "allow",
        reason: `No policy grants ${sanitiseForLog(subject?.roles.join(",") || "anonymous")} ${sanitiseForLog(query.action)} on ${sanitiseForLog(query.resource)}`,
      };
      onDecision?.({ subject, query, result, source: "default" });
      return result;
    },
  };
}

export type AccessControl = ReturnType<typeof createAccessControl>;

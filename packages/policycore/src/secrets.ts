/**
 * Backend-agnostic secrets retrieval. Ships one adapter this pass —
 * local-env — behind a swappable interface, mirroring @azmr/db's
 * DbAdapter/SQLiteAdapter pattern: one interface, one concrete
 * implementation now, future backends (Doppler, AWS SSM) implement the
 * same interface without a breaking change.
 *
 * Deliberately separate from @azmr/security's validateEnv: validateEnv is
 * a boot-time, synchronous, fail-fast presence check over a static list of
 * env var names. This module is a runtime retrieval API for the rest of
 * the app's lifetime, and works when process.env isn't the source of
 * truth at all (a future network-backed adapter). Combine them like this
 * in your own app (not part of this module):
 *
 *   import { validateEnv } from "@azmr/security";
 *   validateEnv(["STRIPE_SECRET_KEY", "DATABASE_URL"]); // fail fast at boot, presence only
 *   const secrets = createSecretsManager({ adapter: createLocalEnvSecretsAdapter() });
 *   const stripeKey = await secrets.get("STRIPE_SECRET_KEY", { required: true }); // runtime retrieval, works with any adapter
 *
 * A future Doppler-backed manager could similarly wire `onAccess` to
 * @azmr/security's createAuditLogger to log secret:accessed events (key
 * name + outcome only, never the value) — a reasonable, encouraged choice
 * in production. Not done here: forcing an audit write on every get()
 * would be a surprising IO/perf cost for a module meant to be usable in
 * hot paths and tests, unlike @azmr/db's per-mutation audit logging where
 * "every mutation" is unambiguously always audit-worthy.
 */

export interface SecretsAdapter {
  /**
   * Retrieve a secret by logical key. Returns undefined when not found —
   * never throws for a missing key. Whether a missing key should be fatal
   * is a decision made by the caller (via SecretsManager's `required`
   * option), not baked into the adapter.
   */
  get(key: string): Promise<string | undefined>;
}

export interface LocalEnvSecretsAdapterOptions {
  /**
   * Prefix prepended to every lookup key before reading process.env, e.g.
   * prefix "AZMARA_SECRET_" + get("DB_PASSWORD") reads
   * process.env.AZMARA_SECRET_DB_PASSWORD. Default: "" (reads
   * process.env[key] directly) — namespacing is opt-in, not forced, since
   * many existing env vars (DATABASE_URL, STRIPE_SECRET_KEY, ...) don't
   * follow a prefix convention and must be usable without renaming.
   *
   * No .env-file loading here — reading/parsing a .env file is the
   * calling application's job (Next.js, dotenv, etc. already do this
   * before any library code runs).
   */
  prefix?: string;
}

/** Reads secrets from process.env. No third-party dependencies. */
export function createLocalEnvSecretsAdapter(
  options: LocalEnvSecretsAdapterOptions = {},
): SecretsAdapter {
  const { prefix = "" } = options;
  return {
    async get(key: string): Promise<string | undefined> {
      return process.env[`${prefix}${key}`];
    },
  };
}

export interface SecretAccessEvent {
  key: string;
  /** "hit" = adapter returned a value; "miss" = adapter returned undefined; "cache" = served from cache, adapter not called. */
  outcome: "hit" | "miss" | "cache";
}

export interface GetSecretOptions {
  /** Throw if the resolved value is undefined. Default false (returns undefined). */
  required?: boolean;
}

export interface SecretsManagerOptions {
  adapter: SecretsAdapter;
  /**
   * Cache TTL in ms for successful lookups. 0 (default) disables caching —
   * correct for the local-env adapter (process.env reads are already free;
   * caching only risks staleness). Set explicitly for network-backed
   * adapters (Doppler/AWS SSM, future work) to avoid re-fetching on every
   * read.
   */
  cacheTtlMs?: number;
  /**
   * Fired on every retrieval attempt. Never receives the secret value —
   * this is a structural guarantee (the event type has no value field),
   * not a redaction pass over a string that might contain one.
   */
  onAccess?: (event: SecretAccessEvent) => void;
}

export function createSecretsManager(options: SecretsManagerOptions) {
  const { adapter, cacheTtlMs = 0, onAccess } = options;
  const cache = new Map<string, { value: string | undefined; expiresAt: number }>();

  async function get(key: string, opts: GetSecretOptions = {}): Promise<string | undefined> {
    const cached = cacheTtlMs > 0 ? cache.get(key) : undefined;
    if (cached && cached.expiresAt > Date.now()) {
      onAccess?.({ key, outcome: "cache" });
      if (opts.required && cached.value === undefined) {
        throw new Error(`[azmr/policycore] required secret "${key}" is not set`);
      }
      return cached.value;
    }

    const value = await adapter.get(key);
    onAccess?.({ key, outcome: value === undefined ? "miss" : "hit" });
    if (cacheTtlMs > 0) cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });

    if (opts.required && value === undefined) {
      throw new Error(`[azmr/policycore] required secret "${key}" is not set`);
    }
    return value;
  }

  return {
    get,
    /** Clears the in-memory cache (e.g. after a rotation, or between tests). No-op if caching is disabled. */
    clearCache(): void {
      cache.clear();
    },
  };
}

export type SecretsManager = ReturnType<typeof createSecretsManager>;

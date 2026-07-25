import crypto from "node:crypto";
import { createAuditLogger, sanitiseForLog } from "@azmr/security";

const KEY_PREFIX = "azmr_ak_";
const KEY_ID_BYTES = 8; // -> 16 hex chars, public identifier (not secret)
const SECRET_BYTES = 32; // -> 256 bits entropy

export interface ApiKeyMetadata {
  keyId: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  /** keyId of the key this one replaced via rotate(), if any. */
  rotatedFrom?: string;
}

export interface IssuedApiKey extends ApiKeyMetadata {
  /**
   * The raw, secret key — shown exactly once. issue() (and rotate(), which
   * issues a replacement) are the only calls that ever return this. It is
   * not retrievable again: only its hash is retained. Store it now.
   */
  rawKey: string;
}

export interface ApiKeyVerifyResult {
  valid: boolean;
  keyId?: string;
  label?: string;
  /** Only present when valid is false. */
  reason?: "malformed" | "unknown" | "revoked";
}

export interface RotateOptions {
  /**
   * If provided and > 0, the OLD key stays valid for this many ms after
   * rotation instead of being invalidated immediately (checked lazily
   * against wall-clock time on each verify() call — no timer is created).
   * Omit (or 0) for the default: immediate invalidation.
   */
  graceMs?: number;
}

export interface ApiKeyManagerOptions {
  /**
   * Optional HMAC pepper. Unlike createJWT's secret (the entire security
   * mechanism) or createColumnEncryption's secret (no secret, no
   * confidentiality), an API key's security already comes from 256 bits of
   * crypto.randomBytes entropy in the secret itself — a pepper here is
   * defense-in-depth only (a leak of the in-memory hash store alone,
   * without the pepper, still isn't directly useful), not load-bearing.
   * Omitting it is not insecure.
   */
  pepper?: string;
}

interface ApiKeyRecord {
  keyId: string;
  label: string;
  hash: Buffer;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  graceExpiresAt?: Date;
  rotatedFrom?: string;
}

/**
 * In-memory API key store.
 *
 * Keys, hashes, and lifecycle metadata (created/rotated/revoked timestamps,
 * last-used-at) live only in this process's memory and are lost on
 * restart or redeploy — every issued key becomes unverifiable the moment
 * the process exits, and no state is shared across multiple instances/
 * processes.
 *
 * Not suitable for multi-process/distributed use, and not durable across
 * restarts. A caller needing either should wire their own persistence —
 * e.g. swap the internal store for a database table keyed by `keyId`
 * storing only `hash`, never the raw key — the same "seam, not
 * built-in" pattern `createAccessControl`'s `resolve` option uses for
 * DB-backed policy checks. This module does not attempt to design that
 * persistence layer.
 *
 * No third-party dependencies — node:crypto only, matching jwt.ts/encrypted.ts.
 */
export function createApiKeyManager(options: ApiKeyManagerOptions = {}) {
  const { pepper } = options;
  const store = new Map<string, ApiKeyRecord>();
  const audit = createAuditLogger("policycore:api-keys");

  function hashSecret(secret: string): Buffer {
    return pepper
      ? crypto.createHmac("sha256", pepper).update(secret).digest()
      : crypto.createHash("sha256").update(secret).digest();
  }

  function generateKeyId(): string {
    let keyId = crypto.randomBytes(KEY_ID_BYTES).toString("hex");
    while (store.has(keyId)) keyId = crypto.randomBytes(KEY_ID_BYTES).toString("hex");
    return keyId;
  }

  function formatRawKey(keyId: string, secret: string): string {
    return `${KEY_PREFIX}${keyId}_${secret}`;
  }

  function parseRawKey(rawKey: string): { keyId: string; secret: string } | null {
    if (!rawKey.startsWith(KEY_PREFIX)) return null;
    const rest = rawKey.slice(KEY_PREFIX.length);
    const keyId = rest.slice(0, KEY_ID_BYTES * 2);
    const sep = rest[KEY_ID_BYTES * 2];
    const secret = rest.slice(KEY_ID_BYTES * 2 + 1);
    if (sep !== "_" || keyId.length !== KEY_ID_BYTES * 2 || !secret) return null;
    if (!/^[0-9a-f]+$/.test(keyId)) return null;
    return { keyId, secret };
  }

  function toMetadata(record: ApiKeyRecord): ApiKeyMetadata {
    return {
      keyId: record.keyId,
      label: record.label,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      revokedAt: record.revokedAt,
      rotatedFrom: record.rotatedFrom,
    };
  }

  function issueInternal(label: string, rotatedFrom?: string): IssuedApiKey {
    const keyId = generateKeyId();
    const secret = crypto.randomBytes(SECRET_BYTES).toString("base64url");
    const record: ApiKeyRecord = {
      keyId,
      label,
      hash: hashSecret(secret),
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      rotatedFrom,
    };
    store.set(keyId, record);
    audit.log("apikey:issued", { keyId, label, rotatedFrom });
    return { ...toMetadata(record), rawKey: formatRawKey(keyId, secret) };
  }

  return {
    issue(label: string): IssuedApiKey {
      if (!label?.trim()) {
        throw new Error("[azmr/policycore] label is required to issue an API key");
      }
      return issueInternal(label);
    },

    rotate(keyId: string, opts: RotateOptions = {}): IssuedApiKey {
      const record = store.get(keyId);
      if (!record) {
        throw new Error(`[azmr/policycore] unknown API key id "${sanitiseForLog(keyId)}"`);
      }
      if (record.revokedAt) {
        throw new Error(
          `[azmr/policycore] cannot rotate revoked API key id "${sanitiseForLog(keyId)}"`,
        );
      }
      const graceMs = opts.graceMs ?? 0;
      if (graceMs > 0) {
        record.graceExpiresAt = new Date(Date.now() + graceMs);
      } else {
        record.revokedAt = new Date();
      }
      const issued = issueInternal(record.label, record.keyId);
      audit.log("apikey:rotated", { keyId, newKeyId: issued.keyId, graceMs });
      return issued;
    },

    revoke(keyId: string): void {
      const record = store.get(keyId);
      if (!record) {
        throw new Error(`[azmr/policycore] unknown API key id "${sanitiseForLog(keyId)}"`);
      }
      if (record.revokedAt) {
        audit.log("apikey:revoke_noop", { keyId });
        return;
      }
      record.revokedAt = new Date();
      audit.log("apikey:revoked", { keyId });
    },

    verify(rawKey: string | null | undefined): ApiKeyVerifyResult {
      if (!rawKey || typeof rawKey !== "string") {
        return { valid: false, reason: "malformed" };
      }
      const parsed = parseRawKey(rawKey);
      if (!parsed) {
        audit.log("apikey:verify_failed", { reason: "malformed" });
        return { valid: false, reason: "malformed" };
      }

      const { keyId, secret } = parsed;
      const record = store.get(keyId);
      if (!record) {
        audit.log("apikey:verify_failed", { keyId, reason: "unknown_keyid" });
        return { valid: false, reason: "unknown" };
      }

      // Secret-derived comparison — timing-safe per this codebase's hard
      // rule (see jwt.ts). keyId lookup above is a plain Map.get because
      // keyId is a public identifier, not secret material.
      const presented = hashSecret(secret);
      const matches =
        presented.length === record.hash.length && crypto.timingSafeEqual(presented, record.hash);
      if (!matches) {
        audit.log("apikey:verify_failed", { keyId, reason: "hash_mismatch" });
        return { valid: false, reason: "unknown" };
      }

      const graceExpired = !!record.graceExpiresAt && Date.now() > record.graceExpiresAt.getTime();
      if (record.revokedAt || graceExpired) {
        audit.log("apikey:verify_failed", { keyId, reason: "revoked" });
        return { valid: false, keyId, label: record.label, reason: "revoked" };
      }

      record.lastUsedAt = new Date();
      return { valid: true, keyId, label: record.label };
    },

    list(): ApiKeyMetadata[] {
      return Array.from(store.values())
        .map(toMetadata)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
  };
}

export type ApiKeyManager = ReturnType<typeof createApiKeyManager>;

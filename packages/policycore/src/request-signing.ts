import crypto from "node:crypto";

export interface RequestSigningInput {
  method: string;
  path: string;
  body?: string | Buffer;
  /** Unix seconds. Defaults to current time. Override only for testing. */
  timestamp?: number;
  /** Hex nonce. Defaults to a fresh crypto.randomBytes(16) value. Override only for testing. */
  nonce?: string;
}

export interface VerifiedSignature {
  timestamp: number;
  nonce: string;
}

export interface VerifyOptions {
  /** Overrides the signer's default tolerance window (seconds) for this call. */
  toleranceSeconds?: number;
}

export interface RequestSignerOptions {
  /** Timestamp tolerance window in seconds. Defaults to 300 (5 min). */
  toleranceSeconds?: number;
  /** Opt-in in-memory nonce replay tracking. Off by default. See doc comment below. */
  trackNonces?: boolean;
}

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Minimal HMAC-SHA256 request signing for service-to-service calls, using
 * Node's built-in crypto. No third-party dependencies — no supply chain surface.
 *
 * Framework-agnostic: takes and returns plain data (method/path/body strings,
 * a header value string) — no assumption of Express/Fastify/etc., matching
 * cors.ts/policy-engine.ts in this package.
 *
 * What gets signed (joined with "\n", HMAC-SHA256'd with the shared secret):
 *   METHOD \n PATH \n sha256hex(BODY) \n TIMESTAMP \n NONCE
 * The body is hashed rather than embedded directly to bound the MAC input
 * size and avoid embedding large/binary payloads directly — the same reason
 * AWS SigV4 and most webhook-signing schemes hash the body.
 *
 * The signature travels as one self-describing header value, Stripe-
 * Signature-style: "t=<unix-seconds>,n=<hex-nonce>,v1=<hex-hmac>". The
 * "v1=" scheme label leaves room for a future algorithm bump without a
 * breaking format change.
 *
 * Replay protection:
 * - A timestamp tolerance window (default 5 min) is enforced on every
 *   verify() call. Stateless — always on, safe with zero configuration.
 * - True replay rejection (refusing an already-seen signature) needs a
 *   nonce store shared by every verifying process. That's opt-in via
 *   `trackNonces` and, even then, in-memory/single-process only — an
 *   attacker can bypass it by replaying against a different instance.
 *   For horizontally-scaled verifiers, leave `trackNonces` off and
 *   implement your own check with the `nonce` verify() returns, backed by
 *   a shared store (e.g. Redis SETNX, TTL >= your tolerance window).
 *
 * Limitations (matching jwt.ts's documented posture):
 * - HMAC-SHA256 only, one shared secret — for service pairs that each hold
 *   the same secret server-side.
 * - No key ID / rotation support built in — rotate by changing the secret
 *   and rolling both sides together, or run two signers during a
 *   rotation window.
 */
export function createRequestSigner(secret: string, options: RequestSignerOptions = {}) {
  if (!secret || secret.length < 32) {
    throw new Error("[azmr/policycore] request signing secret must be at least 32 characters");
  }
  const key = Buffer.from(secret, "utf-8");
  const { toleranceSeconds: defaultTolerance = DEFAULT_TOLERANCE_SECONDS, trackNonces = false } =
    options;

  const seenNonces = trackNonces ? new Map<string, number>() : null;

  function pruneNonces(): void {
    if (!seenNonces) return;
    const now = Date.now();
    for (const [nonce, expiresAt] of seenNonces) {
      if (expiresAt <= now) seenNonces.delete(nonce);
    }
  }

  function canonicalize(
    req: { method: string; path: string; body?: string | Buffer },
    timestamp: number,
    nonce: string,
  ): string {
    const bodyHash = crypto
      .createHash("sha256")
      .update(req.body ?? "")
      .digest("hex");
    return [req.method.toUpperCase(), req.path, bodyHash, String(timestamp), nonce].join("\n");
  }

  function sign(input: RequestSigningInput): string {
    const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
    const nonce = input.nonce ?? crypto.randomBytes(16).toString("hex");
    const canonical = canonicalize(input, timestamp, nonce);
    const signature = crypto.createHmac("sha256", key).update(canonical).digest("hex");
    return `t=${timestamp},n=${nonce},v1=${signature}`;
  }

  function verify(
    signatureHeader: string,
    request: { method: string; path: string; body?: string | Buffer },
    verifyOptions: VerifyOptions = {},
  ): VerifiedSignature {
    const { timestamp, nonce, signature } = parseHeader(signatureHeader);

    const expected = crypto
      .createHmac("sha256", key)
      .update(canonicalize(request, timestamp, nonce))
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error("[azmr/policycore] Invalid request signature");
    }

    const tolerance = verifyOptions.toleranceSeconds ?? defaultTolerance;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      throw new Error(
        "[azmr/policycore] Request signature timestamp is outside the tolerance window",
      );
    }

    if (seenNonces) {
      pruneNonces();
      if (seenNonces.has(nonce)) {
        throw new Error(
          "[azmr/policycore] Request signature nonce has already been used (possible replay)",
        );
      }
      seenNonces.set(nonce, Date.now() + tolerance * 1000);
    }

    return { timestamp, nonce };
  }

  return {
    sign,
    verify,
    resetNonces(): void {
      seenNonces?.clear();
    },
  };
}

function parseHeader(header: string): { timestamp: number; nonce: string; signature: string } {
  const parts = new Map<string, string>();
  for (const pair of header.split(",")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    parts.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }

  const t = parts.get("t");
  const n = parts.get("n");
  const v1 = parts.get("v1");
  if (!t || !n || !v1 || !/^\d+$/.test(t)) {
    throw new Error("[azmr/policycore] Invalid request signature format");
  }

  return { timestamp: Number(t), nonce: n, signature: v1 };
}

export type RequestSigner = ReturnType<typeof createRequestSigner>;

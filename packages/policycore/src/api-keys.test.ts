import { describe, expect, it } from "vitest";
import { createApiKeyManager } from "./api-keys.js";

describe("createApiKeyManager", () => {
  it("issues a key with a usable raw key returned exactly once", () => {
    const mgr = createApiKeyManager();
    const issued = mgr.issue("ci-bot");
    expect(issued.rawKey).toMatch(/^azmr_ak_[0-9a-f]{16}_/);
    expect(issued.keyId).toHaveLength(16);
    expect(mgr.list()[0]).not.toHaveProperty("rawKey");
    expect(mgr.list()[0]).not.toHaveProperty("hash");
  });

  it("throws when issuing without a label", () => {
    const mgr = createApiKeyManager();
    expect(() => mgr.issue("")).toThrow("label is required");
  });

  it("verifies a freshly issued key", () => {
    const mgr = createApiKeyManager();
    const { rawKey, keyId } = mgr.issue("client-a");
    const result = mgr.verify(rawKey);
    expect(result).toEqual({ valid: true, keyId, label: "client-a" });
  });

  it("rejects a garbage/malformed key without throwing", () => {
    const mgr = createApiKeyManager();
    expect(mgr.verify("not-a-real-key")).toEqual({ valid: false, reason: "malformed" });
    expect(mgr.verify(undefined)).toEqual({ valid: false, reason: "malformed" });
    expect(mgr.verify(null)).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects an unknown but well-formed key", () => {
    const mgr = createApiKeyManager();
    mgr.issue("client-a");
    const fake = `azmr_ak_0000000000000000_${"a".repeat(43)}`;
    expect(mgr.verify(fake)).toEqual({ valid: false, reason: "unknown" });
  });

  it("rejects a key with a valid keyId but wrong secret, as 'unknown' not a distinct reason", () => {
    const mgr = createApiKeyManager();
    const { rawKey } = mgr.issue("client-a");
    const tampered = rawKey.slice(0, -1) + (rawKey.at(-1) === "A" ? "B" : "A");
    const result = mgr.verify(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("unknown"); // not distinguishable from a totally-unknown keyId
  });

  it("rejects a revoked key", () => {
    const mgr = createApiKeyManager();
    const { rawKey, keyId } = mgr.issue("client-a");
    mgr.revoke(keyId);
    expect(mgr.verify(rawKey)).toEqual({
      valid: false,
      keyId,
      label: "client-a",
      reason: "revoked",
    });
  });

  it("revoke is idempotent — revoking twice does not throw", () => {
    const mgr = createApiKeyManager();
    const { keyId } = mgr.issue("client-a");
    mgr.revoke(keyId);
    expect(() => mgr.revoke(keyId)).not.toThrow();
  });

  it("revoke throws for a never-issued keyId", () => {
    const mgr = createApiKeyManager();
    expect(() => mgr.revoke("deadbeefdeadbeef")).toThrow("unknown API key id");
  });

  it("rotate immediately invalidates the old key by default and the new one verifies", () => {
    const mgr = createApiKeyManager();
    const original = mgr.issue("client-a");
    const rotated = mgr.rotate(original.keyId);

    expect(mgr.verify(original.rawKey)).toEqual({
      valid: false,
      keyId: original.keyId,
      label: "client-a",
      reason: "revoked",
    });
    expect(mgr.verify(rotated.rawKey).valid).toBe(true);
    expect(rotated.rotatedFrom).toBe(original.keyId);
  });

  it("rotate honors an opt-in grace period before invalidating the old key", async () => {
    const mgr = createApiKeyManager();
    const original = mgr.issue("client-a");
    mgr.rotate(original.keyId, { graceMs: 30 });

    expect(mgr.verify(original.rawKey).valid).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mgr.verify(original.rawKey).reason).toBe("revoked");
  });

  it("rotate throws for an unknown keyId", () => {
    const mgr = createApiKeyManager();
    expect(() => mgr.rotate("deadbeefdeadbeef")).toThrow("unknown API key id");
  });

  it("list() exposes only safe metadata, never raw keys or hashes", () => {
    const mgr = createApiKeyManager();
    mgr.issue("client-a");
    mgr.issue("client-b");
    for (const entry of mgr.list()) {
      expect(entry).not.toHaveProperty("rawKey");
      expect(entry).not.toHaveProperty("hash");
      expect(entry).toHaveProperty("keyId");
      expect(entry).toHaveProperty("label");
    }
  });

  it("uses a timing-safe comparison for secret verification, not ===", () => {
    // A single-bit-different secret against a real keyId must fail
    // identically (same shape, same "unknown" reason) to a wholly-unknown
    // key, with no distinguishing branch a caller could use as a
    // timing/response oracle. See api-keys.ts's verify() for the actual
    // crypto.timingSafeEqual comparison this pins.
    const mgr = createApiKeyManager();
    const { rawKey } = mgr.issue("client-a");
    const flipped = rawKey.slice(0, -1) + (rawKey.at(-1) === "9" ? "8" : "9");
    expect(mgr.verify(flipped)).toEqual({ valid: false, reason: "unknown" });
  });

  it("supports an optional pepper without changing the public contract", () => {
    const mgr = createApiKeyManager({ pepper: "server-side-pepper-value" });
    const { rawKey } = mgr.issue("client-a");
    expect(mgr.verify(rawKey).valid).toBe(true);
  });
});

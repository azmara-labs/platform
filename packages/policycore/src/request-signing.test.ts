import { describe, expect, it } from "vitest";
import { createRequestSigner } from "./request-signing.js";

const SECRET = "super-secret-key-at-least-32-chars!!";
const REQ = { method: "POST", path: "/api/orders/42", body: JSON.stringify({ qty: 3 }) };

describe("createRequestSigner", () => {
  it("throws if secret is too short", () => {
    expect(() => createRequestSigner("short")).toThrow("at least 32 characters");
  });

  it("signs and verifies a request round trip", () => {
    const signer = createRequestSigner(SECRET);
    const header = signer.sign(REQ);
    const result = signer.verify(header, REQ);
    expect(result.timestamp).toBeTypeOf("number");
    expect(result.nonce).toBeTypeOf("string");
  });

  it("produces a header in the t=,n=,v1= format", () => {
    const signer = createRequestSigner(SECRET);
    const header = signer.sign(REQ);
    expect(header).toMatch(/^t=\d+,n=[0-9a-f]+,v1=[0-9a-f]+$/);
  });

  it("rejects a tampered body", () => {
    const signer = createRequestSigner(SECRET);
    const header = signer.sign(REQ);
    expect(() => signer.verify(header, { ...REQ, body: '{"qty":999}' })).toThrow(
      "Invalid request signature",
    );
  });

  it("rejects a tampered path", () => {
    const signer = createRequestSigner(SECRET);
    const header = signer.sign(REQ);
    expect(() => signer.verify(header, { ...REQ, path: "/api/orders/43" })).toThrow(
      "Invalid request signature",
    );
  });

  it("rejects a tampered method", () => {
    const signer = createRequestSigner(SECRET);
    const header = signer.sign(REQ);
    expect(() => signer.verify(header, { ...REQ, method: "DELETE" })).toThrow(
      "Invalid request signature",
    );
  });

  it("rejects a signature produced with a different secret", () => {
    const signerA = createRequestSigner(SECRET);
    const signerB = createRequestSigner("a-totally-different-secret-32-chars!");
    const header = signerA.sign(REQ);
    expect(() => signerB.verify(header, REQ)).toThrow("Invalid request signature");
  });

  it("rejects a timestamp outside the tolerance window (too old)", () => {
    const signer = createRequestSigner(SECRET, { toleranceSeconds: 60 });
    const header = signer.sign({ ...REQ, timestamp: Math.floor(Date.now() / 1000) - 120 });
    expect(() => signer.verify(header, REQ)).toThrow("outside the tolerance window");
  });

  it("rejects a timestamp too far in the future", () => {
    const signer = createRequestSigner(SECRET, { toleranceSeconds: 60 });
    const header = signer.sign({ ...REQ, timestamp: Math.floor(Date.now() / 1000) + 120 });
    expect(() => signer.verify(header, REQ)).toThrow("outside the tolerance window");
  });

  it("accepts a per-call toleranceSeconds override", () => {
    const signer = createRequestSigner(SECRET, { toleranceSeconds: 60 });
    const header = signer.sign({ ...REQ, timestamp: Math.floor(Date.now() / 1000) - 120 });
    const result = signer.verify(header, REQ, { toleranceSeconds: 300 });
    expect(result.timestamp).toBeTypeOf("number");
  });

  it("rejects a malformed signature header", () => {
    const signer = createRequestSigner(SECRET);
    expect(() => signer.verify("not-a-valid-header", REQ)).toThrow(
      "Invalid request signature format",
    );
  });

  it("rejects a header missing required fields", () => {
    const signer = createRequestSigner(SECRET);
    expect(() => signer.verify("t=123,n=abc", REQ)).toThrow("Invalid request signature format");
  });

  describe("nonce replay tracking (opt-in)", () => {
    it("does NOT reject a replayed header by default (stateless mode)", () => {
      const signer = createRequestSigner(SECRET);
      const header = signer.sign(REQ);
      signer.verify(header, REQ);
      expect(() => signer.verify(header, REQ)).not.toThrow();
    });

    it("rejects a replayed header when trackNonces is enabled", () => {
      const signer = createRequestSigner(SECRET, { trackNonces: true });
      const header = signer.sign(REQ);
      signer.verify(header, REQ);
      expect(() => signer.verify(header, REQ)).toThrow("already been used");
    });

    it("resetNonces() clears tracked nonces", () => {
      const signer = createRequestSigner(SECRET, { trackNonces: true });
      const header = signer.sign(REQ);
      signer.verify(header, REQ);
      signer.resetNonces();
      expect(() => signer.verify(header, REQ)).not.toThrow();
    });
  });
});

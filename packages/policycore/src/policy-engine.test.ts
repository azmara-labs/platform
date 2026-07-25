import type { AccessControlSubject } from "@azmr/security";
import { createAccessControl } from "@azmr/security";
import { describe, expect, it, vi } from "vitest";
import { createPolicyEngine } from "./policy-engine.js";

const admin: AccessControlSubject = { id: "u1", roles: ["admin"] };

describe("createPolicyEngine — construction", () => {
  it("throws at construction when a policy declares auth but no accessControl is supplied", () => {
    expect(() =>
      createPolicyEngine({
        policies: { "reports:read": { auth: { resource: "reports", action: "read" } } },
      }),
    ).toThrow("accessControl");
  });

  it("throws at construction when a policy's cors config is invalid", () => {
    expect(() =>
      createPolicyEngine({
        policies: { open: { cors: { allowedOrigins: "*", allowCredentials: true } } },
      }),
    ).toThrow("allowCredentials");
  });
});

describe("createPolicyEngine — evaluate", () => {
  it("throws when evaluating an unknown policy name", async () => {
    const engine = createPolicyEngine({ policies: {} });
    await expect(engine.evaluate("nope", {})).rejects.toThrow('unknown policy "nope"');
  });

  it("allows a request within the rate limit", async () => {
    const engine = createPolicyEngine({
      policies: { ping: { rateLimit: { options: { maxRequests: 2, windowMs: 1000 } } } },
    });
    const result = await engine.evaluate("ping", { ip: "1.2.3.4" });
    expect(result.allowed).toBe(true);
    expect(result.rateLimit?.allowed).toBe(true);
  });

  it("denies a request over the rate limit and includes rateLimit in the result", async () => {
    const engine = createPolicyEngine({
      policies: { ping: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } } },
    });
    await engine.evaluate("ping", { ip: "1.2.3.4" });
    const result = await engine.evaluate("ping", { ip: "1.2.3.4" });
    expect(result.allowed).toBe(false);
    expect(result.rateLimit?.allowed).toBe(false);
    expect(result.reason).toContain("Rate limit exceeded");
  });

  it("keys rate limits by subject.id by default, falling back to ip", async () => {
    const engine = createPolicyEngine({
      policies: { ping: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } } },
    });
    await engine.evaluate("ping", { subject: admin });
    const bySubjectAgain = await engine.evaluate("ping", { subject: admin });
    expect(bySubjectAgain.allowed).toBe(false);

    const byIp = await engine.evaluate("ping", { ip: "9.9.9.9" });
    expect(byIp.allowed).toBe(true); // different key (no subject), independent bucket
  });

  it("throws a descriptive error when a rate-limited policy is evaluated without ip, subject.id, or keyedBy", async () => {
    const engine = createPolicyEngine({
      policies: { ping: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } } },
    });
    await expect(engine.evaluate("ping", {})).rejects.toThrow(
      "requires context.subject.id or context.ip",
    );
  });

  it("maintains independent rate-limit buckets per policy for the same subject", async () => {
    const engine = createPolicyEngine({
      policies: {
        a: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } },
        b: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } },
      },
    });
    await engine.evaluate("a", { subject: admin });
    const resultB = await engine.evaluate("b", { subject: admin });
    expect(resultB.allowed).toBe(true);
  });

  it("denies when the auth requirement is not satisfied", async () => {
    const accessControl = createAccessControl({
      policy: { admin: [{ resource: "reports", action: "read" }] },
    });
    const engine = createPolicyEngine({
      accessControl,
      policies: { "reports:read": { auth: { resource: "reports", action: "read" } } },
    });
    const result = await engine.evaluate("reports:read", {
      subject: { id: "u2", roles: ["guest"] },
    });
    expect(result.allowed).toBe(false);
    expect(result.auth?.can).toBe(false);
  });

  it("allows when the auth requirement is satisfied", async () => {
    const accessControl = createAccessControl({
      policy: { admin: [{ resource: "reports", action: "read" }] },
    });
    const engine = createPolicyEngine({
      accessControl,
      policies: { "reports:read": { auth: { resource: "reports", action: "read" } } },
    });
    const result = await engine.evaluate("reports:read", { subject: admin });
    expect(result.allowed).toBe(true);
    expect(result.auth?.can).toBe(true);
  });

  it("short-circuits at rate-limit denial without ever calling accessControl.can", async () => {
    const can = vi.fn().mockResolvedValue({ can: true });
    const accessControl = { can } as unknown as ReturnType<typeof createAccessControl>;
    const engine = createPolicyEngine({
      accessControl,
      policies: {
        gated: {
          rateLimit: { options: { maxRequests: 1, windowMs: 1000 } },
          auth: { resource: "x", action: "y" },
        },
      },
    });
    await engine.evaluate("gated", { subject: admin }); // within limit — reaches and calls auth
    expect(can).toHaveBeenCalledTimes(1);
    await engine.evaluate("gated", { subject: admin }); // over limit — should short-circuit before auth
    expect(can).toHaveBeenCalledTimes(1);
  });

  it("a CORS mismatch does not flip result.allowed", async () => {
    const engine = createPolicyEngine({
      policies: { open: { cors: { allowedOrigins: ["https://app.azmara.io"] } } },
    });
    const result = await engine.evaluate("open", { origin: "https://evil.com" });
    expect(result.allowed).toBe(true);
    expect(result.cors?.allowed).toBe(false);
  });

  it("fires onDecision on every evaluate call, including denials", async () => {
    const onDecision = vi.fn();
    const engine = createPolicyEngine({
      onDecision,
      policies: { ping: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } } },
    });
    await engine.evaluate("ping", { ip: "1.2.3.4" });
    await engine.evaluate("ping", { ip: "1.2.3.4" });
    expect(onDecision).toHaveBeenCalledTimes(2);
    expect(onDecision).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "ping",
        result: expect.objectContaining({ allowed: false }),
      }),
    );
  });

  it("leaves rateLimit/auth/cors undefined when a policy omits them", async () => {
    const engine = createPolicyEngine({ policies: { open: {} } });
    const result = await engine.evaluate("open", {});
    expect(result).toEqual({
      allowed: true,
      rateLimit: undefined,
      auth: undefined,
      cors: undefined,
    });
  });

  it("resetRateLimit clears one key, or all keys when no key is given", async () => {
    const engine = createPolicyEngine({
      policies: { ping: { rateLimit: { options: { maxRequests: 1, windowMs: 1000 } } } },
    });
    await engine.evaluate("ping", { ip: "1.1.1.1" });
    engine.resetRateLimit("ping", "1.1.1.1");
    expect((await engine.evaluate("ping", { ip: "1.1.1.1" })).allowed).toBe(true);

    await engine.evaluate("ping", { ip: "2.2.2.2" }); // now at limit
    engine.resetRateLimit("ping");
    expect((await engine.evaluate("ping", { ip: "2.2.2.2" })).allowed).toBe(true);
  });
});

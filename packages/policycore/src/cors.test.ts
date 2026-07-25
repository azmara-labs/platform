import { describe, expect, it } from "vitest";
import type { CorsPolicy } from "./cors.js";
import { evaluateCors, validateCorsPolicy } from "./cors.js";

describe("validateCorsPolicy", () => {
  it("throws when allowCredentials is combined with allowedOrigins '*'", () => {
    expect(() => validateCorsPolicy({ allowedOrigins: "*", allowCredentials: true })).toThrow(
      "allowCredentials",
    );
  });

  it("does not throw for a valid policy", () => {
    expect(() =>
      validateCorsPolicy({ allowedOrigins: ["https://app.azmara.io"], allowCredentials: true }),
    ).not.toThrow();
  });
});

describe("evaluateCors", () => {
  it("allows a matching exact origin", () => {
    const policy: CorsPolicy = { allowedOrigins: ["https://app.azmara.io"] };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.allowed).toBe(true);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://app.azmara.io");
  });

  it("denies a non-matching origin, with a reason naming it", () => {
    const policy: CorsPolicy = { allowedOrigins: ["https://app.azmara.io"] };
    const result = evaluateCors(policy, "https://evil.example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("https://evil.example.com");
  });

  it("allows any origin with allowedOrigins '*' and reflects '*'", () => {
    const policy: CorsPolicy = { allowedOrigins: "*" };
    const result = evaluateCors(policy, "https://anything.example.com");
    expect(result.allowed).toBe(true);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("reflects the exact origin, not '*', when allowCredentials is true and the origin matches", () => {
    const policy: CorsPolicy = {
      allowedOrigins: ["https://app.azmara.io"],
      allowCredentials: true,
    };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://app.azmara.io");
    expect(result.headers["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("does not set Access-Control-Allow-Credentials when allowCredentials is false/omitted", () => {
    const policy: CorsPolicy = { allowedOrigins: ["https://app.azmara.io"] };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });

  it("evaluates a predicate allowedOrigins function", () => {
    const policy: CorsPolicy = { allowedOrigins: (origin) => origin.endsWith(".azmara.io") };
    expect(evaluateCors(policy, "https://app.azmara.io").allowed).toBe(true);
    expect(evaluateCors(policy, "https://evil.com").allowed).toBe(false);
  });

  it("treats a throwing predicate as denied (fail closed)", () => {
    const policy: CorsPolicy = {
      allowedOrigins: () => {
        throw new Error("boom");
      },
    };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.allowed).toBe(false);
  });

  it("returns allowed:true with empty headers when no Origin header is present", () => {
    const policy: CorsPolicy = { allowedOrigins: ["https://app.azmara.io"] };
    const result = evaluateCors(policy, undefined);
    expect(result).toEqual({ allowed: true, headers: {} });
  });

  it("includes Vary: Origin on both match and non-match when allowedOrigins is not '*'", () => {
    const policy: CorsPolicy = { allowedOrigins: ["https://app.azmara.io"] };
    expect(evaluateCors(policy, "https://app.azmara.io").headers.Vary).toBe("Origin");
    expect(evaluateCors(policy, "https://evil.com").headers.Vary).toBe("Origin");
  });

  it("omits Vary when allowedOrigins is '*'", () => {
    const policy: CorsPolicy = { allowedOrigins: "*" };
    expect(evaluateCors(policy, "https://app.azmara.io").headers.Vary).toBeUndefined();
  });

  it("uses default allowedMethods when not specified", () => {
    const policy: CorsPolicy = { allowedOrigins: "*" };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.headers["Access-Control-Allow-Methods"]).toBe("GET, POST");
  });

  it("uses caller-supplied methods/headers/maxAge", () => {
    const policy: CorsPolicy = {
      allowedOrigins: "*",
      allowedMethods: ["GET", "DELETE"],
      allowedHeaders: ["X-Custom"],
      exposedHeaders: ["X-Total-Count"],
      maxAgeSeconds: 600,
    };
    const result = evaluateCors(policy, "https://app.azmara.io");
    expect(result.headers["Access-Control-Allow-Methods"]).toBe("GET, DELETE");
    expect(result.headers["Access-Control-Allow-Headers"]).toBe("X-Custom");
    expect(result.headers["Access-Control-Expose-Headers"]).toBe("X-Total-Count");
    expect(result.headers["Access-Control-Max-Age"]).toBe("600");
  });

  it("matches a *.example.com wildcard against a subdomain but not the bare parent domain", () => {
    const policy: CorsPolicy = { allowedOrigins: ["*.azmara.io"] };
    expect(evaluateCors(policy, "https://app.azmara.io").allowed).toBe(true);
    expect(evaluateCors(policy, "https://azmara.io").allowed).toBe(false);
  });
});

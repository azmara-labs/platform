import { describe, expect, it } from "vitest";
import { scanSourceForPolicyIssues } from "./scan.js";

describe("scanSourceForPolicyIssues", () => {
  it("flags allowedOrigins: '*' combined with allowCredentials: true", () => {
    const source = `const policy = { allowedOrigins: "*", allowCredentials: true };`;
    const findings = scanSourceForPolicyIssues("test.ts", source);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe("cors-wildcard-with-credentials");
    expect(findings[0]?.severity).toBe("error");
  });

  it("flags it regardless of key order", () => {
    const source = `const policy = { allowCredentials: true, allowedOrigins: "*" };`;
    expect(scanSourceForPolicyIssues("test.ts", source)).toHaveLength(1);
  });

  it("flags it across multiple lines", () => {
    const source = `
const policy = {
  allowedOrigins: "*",
  allowCredentials: true,
};`;
    const findings = scanSourceForPolicyIssues("test.ts", source);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBeGreaterThan(1);
  });

  it("does not flag allowedOrigins alone", () => {
    const source = `const policy = { allowedOrigins: "*" };`;
    expect(scanSourceForPolicyIssues("test.ts", source)).toHaveLength(0);
  });

  it("does not flag allowCredentials: false", () => {
    const source = `const policy = { allowedOrigins: "*", allowCredentials: false };`;
    expect(scanSourceForPolicyIssues("test.ts", source)).toHaveLength(0);
  });

  it("does not cross-match across two separate sibling object literals", () => {
    const source = `
const a = { allowedOrigins: "*" };
const b = { allowCredentials: true };`;
    expect(scanSourceForPolicyIssues("test.ts", source)).toHaveLength(0);
  });

  it("returns no findings for clean source", () => {
    expect(scanSourceForPolicyIssues("test.ts", "const x = 1;")).toHaveLength(0);
  });
});

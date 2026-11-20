import { describe, expect, it } from "vitest";
import { findPolicyDrift } from "./check.js";
import type { PolicyDocument } from "./types.js";

const document: PolicyDocument = {
  lastUpdated: "1 January 2026",
  contact: "privacy@example.test",
  sections: [],
  processors: [
    {
      name: "Mailer",
      purpose: "Email",
      data: "Addresses",
      location: "Overseas",
      sites: ["app"],
      evidence: { dependency: "mailer-sdk", env: "MAILER_KEY" },
    },
    {
      name: "Forms",
      purpose: "Spam checks",
      data: "Browser details",
      location: "Overseas",
      sites: ["website"],
      evidence: { dependency: "forms-sdk" },
    },
  ],
};

const base = {
  document,
  site: "app" as const,
  dependencies: { "mailer-sdk": "1.0.0" },
  envExample: "MAILER_KEY=\nOTHER=\n",
};

describe("findPolicyDrift", () => {
  it("is empty when the policy matches the code", () => {
    expect(findPolicyDrift(base)).toEqual([]);
  });

  it("only checks the processors for the site being tested", () => {
    // "forms-sdk" isn't a dependency of the app, and that's fine: it's a website processor.
    expect(findPolicyDrift(base)).toEqual([]);
    expect(findPolicyDrift({ ...base, site: "website" })).toEqual([
      "Forms: the policy names it but forms-sdk isn't a dependency",
    ]);
  });

  it("reports a named provider whose package has gone", () => {
    expect(findPolicyDrift({ ...base, dependencies: {} })).toEqual([
      "Mailer: the policy names it but mailer-sdk isn't a dependency",
    ]);
  });

  it("reports a named provider whose env var has gone", () => {
    expect(findPolicyDrift({ ...base, envExample: "OTHER=\n" })).toEqual([
      "Mailer: the policy names it but MAILER_KEY isn't in the env example",
    ]);
  });

  it("matches an env var by exact name, not as a prefix of another", () => {
    expect(findPolicyDrift({ ...base, envExample: "MAILER_KEY_OLD=\n" })).toHaveLength(1);
  });

  it("reports a service the code uses that the policy doesn't name", () => {
    const problems = findPolicyDrift({
      ...base,
      dependencies: { "mailer-sdk": "1", "sms-sdk": "1" },
      serviceDependencies: ["mailer-sdk", "sms-sdk", "not-installed"],
    });
    expect(problems).toEqual(["sms-sdk is used but no processor in the policy covers it"]);
  });

  it("reports a tracker the policy's cookie statement rules out", () => {
    const problems = findPolicyDrift({
      ...base,
      dependencies: { "mailer-sdk": "1", "posthog-js": "1" },
      trackerPattern: /posthog|mixpanel/,
    });
    expect(problems).toEqual(["posthog-js is a tracker the policy doesn't allow for"]);
  });

  it("asks for evidence when a processor has none", () => {
    const bare: PolicyDocument = {
      ...document,
      processors: document.processors.map((p) => ({ ...p, evidence: {} })),
    };
    expect(findPolicyDrift({ ...base, document: bare })).toEqual(["Mailer: no evidence given"]);
  });
});

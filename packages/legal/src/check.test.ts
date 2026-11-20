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
    {
      name: "Weather",
      purpose: "Local weather",
      data: "Coordinates",
      location: "Overseas",
      sites: ["website"],
      evidence: { host: "weather.example" },
    },
  ],
};

const sources = {
  "src/weather.ts": "fetch(`https://api.weather.example/v1/forecast`); // docs: https://own.test/",
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
    expect(findPolicyDrift({ ...base, site: "website", sources })).toEqual([
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

  describe("hosts the source contacts", () => {
    const website = { ...base, site: "website" as const, dependencies: { "forms-sdk": "1" } };

    it("accepts a processor whose host appears in the source, including its subdomains", () => {
      expect(findPolicyDrift({ ...website, sources })).toEqual([]);
    });

    it("reports a named host the source no longer contacts", () => {
      expect(findPolicyDrift({ ...website, sources: { "src/a.ts": "const x = 1;" } })).toEqual([
        "Weather: the policy names it but weather.example isn't in the source",
      ]);
    });

    it("does not match a host that only ends with the same letters", () => {
      const lookalike = { "src/a.ts": "fetch('https://notweather.example/x')" };
      expect(findPolicyDrift({ ...website, sources: lookalike })).toEqual([
        "Weather: the policy names it but weather.example isn't in the source",
      ]);
    });

    it("asks for the sources when a processor's evidence is a host", () => {
      expect(findPolicyDrift(website)).toEqual([
        "Weather: its evidence is the host weather.example but no sources were given",
      ]);
    });

    it("reports a host the source contacts that the policy doesn't name", () => {
      const problems = findPolicyDrift({
        ...website,
        sources: { ...sources, "src/geo.ts": "fetch('http://geo.unknown.test/json')" },
        allowedHosts: ["own.test"],
      });
      expect(problems).toEqual([
        "geo.unknown.test is contacted in src/geo.ts but no processor in the policy covers it",
      ]);
    });

    it("lets allowed hosts, their subdomains and localhost through", () => {
      const problems = findPolicyDrift({
        ...website,
        sources: {
          ...sources,
          "src/links.ts": "https://www.own.test/a http://localhost:3000 https://LOCALHOST/",
        },
        allowedHosts: ["own.test"],
      });
      expect(problems).toEqual([]);
    });

    it("does not look for unnamed hosts unless it is given an allow list", () => {
      const open = { ...sources, "src/geo.ts": "fetch('http://geo.unknown.test/json')" };
      expect(findPolicyDrift({ ...website, sources: open })).toEqual([]);
    });

    it("says when an allow list has nothing to check against", () => {
      expect(findPolicyDrift({ ...website, allowedHosts: ["own.test"] })).toContain(
        "allowedHosts needs sources to check against",
      );
    });
  });

  it("reports every tracker even when the pattern has the g or y flag", () => {
    // A global regex remembers where it last matched, so reusing it would skip the second name.
    for (const flags of ["g", "y", "gy"]) {
      const problems = findPolicyDrift({
        ...base,
        dependencies: { "mailer-sdk": "1", "posthog-js": "1", "posthog-node": "1" },
        trackerPattern: new RegExp("posthog", flags),
      });
      expect(problems).toEqual([
        "posthog-js is a tracker the policy doesn't allow for",
        "posthog-node is a tracker the policy doesn't allow for",
      ]);
    }
  });

  it("does not take an inherited object key for an installed package", () => {
    const named: PolicyDocument = {
      ...document,
      processors: document.processors.map((p) => ({
        ...p,
        evidence: { dependency: "constructor" },
      })),
    };
    expect(findPolicyDrift({ ...base, document: named, dependencies: {} })).toEqual([
      "Mailer: the policy names it but constructor isn't a dependency",
    ]);
    expect(
      findPolicyDrift({
        ...base,
        document: { ...document, processors: [] },
        dependencies: {},
        serviceDependencies: ["constructor"],
      }),
    ).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { azmaraPrivacyPolicy as policy } from "./azmara.js";

describe("Azmara privacy policy", () => {
  it("has a unique, filled-in id and heading for every section", () => {
    const ids = policy.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of policy.sections) {
      expect(section.heading).not.toBe("");
      expect(section.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it("covers what the privacy ticket asked for", () => {
    const ids = policy.sections.map((s) => s.id);
    for (const id of ["collect", "why", "sharing", "overseas", "keep", "rights", "cookies"]) {
      expect(ids).toContain(id);
    }
  });

  it("names a contact that looks like an email address", () => {
    expect(policy.contact).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it("says which site each processor belongs to, and gives it a way to be checked", () => {
    for (const processor of policy.processors) {
      expect(processor.sites.length).toBeGreaterThan(0);
      const { dependency, env, host } = processor.evidence;
      expect(dependency ?? env ?? host).toBeDefined();
    }
    const names = policy.processors.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("names the weather and place-name services the website's location feature calls", () => {
    const website = policy.processors.filter((p) => p.sites.includes("website"));
    const hosts = website.map((p) => p.evidence.host);
    expect(hosts).toContain("open-meteo.com");
    expect(hosts).toContain("bigdatacloud.net");
  });
});

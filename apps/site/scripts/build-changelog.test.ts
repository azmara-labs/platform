import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseChangelog } from "./build-changelog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("parseChangelog", () => {
  it("parses a single-version changesets CHANGELOG.md (packages/db-supabase)", () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, "packages/db-supabase/CHANGELOG.md"),
      "utf-8",
    );
    const entries = parseChangelog(content);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.version).toBe("0.2.0");
    expect(entries[0]?.body).toContain("SupabaseAdapter");
  });

  it("parses a multi-version changesets CHANGELOG.md (packages/security)", () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, "packages/security/CHANGELOG.md"),
      "utf-8",
    );
    const entries = parseChangelog(content);

    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.map((e) => e.version)).toContain("0.3.0");
    expect(entries.map((e) => e.version)).toContain("0.2.0");

    const latest = entries.find((e) => e.version === "0.3.0");
    expect(latest?.body).toContain("createAccessControl");
  });

  it("parses a CHANGELOG.md that still has changesets' generic default heading (packages/core)", () => {
    const content = fs.readFileSync(path.join(REPO_ROOT, "packages/core/CHANGELOG.md"), "utf-8");
    const entries = parseChangelog(content);

    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it("returns no entries for content with no version headings", () => {
    const entries = parseChangelog("# @azmr/example\n\nNo releases yet.\n");
    expect(entries).toHaveLength(0);
  });
});

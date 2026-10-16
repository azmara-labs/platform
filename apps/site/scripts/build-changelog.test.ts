import { describe, expect, it } from "vitest";
import { parseChangelog } from "./build-changelog.js";

// Inline fixtures, not the real packages/*/CHANGELOG.md files: `changeset version`
// rewrites those on every release, and the Release job runs the test suite
// (via the pre-push hook) against the freshly versioned files.

const SINGLE_VERSION = `# @azmr/example

## 0.2.0

### Minor Changes

- c4f2c02: Initial release. \`ExampleAdapter\` implements the interface.
`;

const MULTI_VERSION = `# @azmr/example

## 0.3.0

### Minor Changes

- a1b2c3d: Add \`createAccessControl\`.

## 0.2.0

### Minor Changes

- e4f5a6b: Add rate limiting.
`;

const GENERIC_HEADING = `# Changelog

## 0.0.2

### Patch Changes

- 5bf56bb: Fix package metadata.

All notable changes to this project will be documented in this file.
`;

describe("parseChangelog", () => {
  it("parses a single-version changesets CHANGELOG.md", () => {
    const entries = parseChangelog(SINGLE_VERSION);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.version).toBe("0.2.0");
    expect(entries[0]?.body).toContain("ExampleAdapter");
  });

  it("parses a multi-version changesets CHANGELOG.md, newest first", () => {
    const entries = parseChangelog(MULTI_VERSION);

    expect(entries.map((e) => e.version)).toEqual(["0.3.0", "0.2.0"]);
    expect(entries[0]?.body).toContain("createAccessControl");
    expect(entries[1]?.body).toContain("rate limiting");
  });

  it("parses a CHANGELOG.md that still has changesets' generic default heading", () => {
    const entries = parseChangelog(GENERIC_HEADING);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.version).toBe("0.0.2");
  });

  it("returns no entries for content with no version headings", () => {
    const entries = parseChangelog("# @azmr/example\n\nNo releases yet.\n");
    expect(entries).toHaveLength(0);
  });
});

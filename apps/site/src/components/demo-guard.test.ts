import { describe, expect, it } from "vitest";
import type { DemoName } from "../demos/registry";
import { Demo } from "./demo";

// Demo loads each demo lazily (demos/lazy.tsx), so it no longer indexes the registry and must check
// a name against demos/names.ts itself: otherwise a typo surfaced as a raw ENOENT, and an
// unregistered demo file as React's opaque "Element type is invalid".
describe("Demo name guard", () => {
  it.each([
    ["a well-formed name that is not registered", "button/no-such-demo"],
    ["a malformed name", "../registry"],
  ])("rejects %s with a clear message", async (_label, name) => {
    await expect(Demo({ name: name as DemoName })).rejects.toThrow(
      /Unknown demo .*Register it in src\/demos\/registry\.ts/,
    );
  });
});

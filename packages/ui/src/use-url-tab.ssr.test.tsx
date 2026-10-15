// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "./test-utils/ssr.js";
import { useUrlTab } from "./use-url-tab.js";

function Probe() {
  const [tab] = useUrlTab({ values: ["a", "b"] as const, defaultValue: "a" });
  return <output>{tab}</output>;
}

describe("useUrlTab server-renders without browser globals", () => {
  it("renders the default value on the server (no window, no flash of another tab)", () => {
    expect(expectServerSafe(<Probe />)).toContain(">a<");
  });
});

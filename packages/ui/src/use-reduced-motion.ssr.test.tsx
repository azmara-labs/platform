// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "./test-utils/ssr.js";
import { useReducedMotion } from "./use-reduced-motion.js";

function Probe() {
  return <output>{String(useReducedMotion())}</output>;
}

describe("useReducedMotion on the server", () => {
  it("renders false without browser globals, so server and first client render agree", () => {
    expect(expectServerSafe(<Probe />)).toContain(">false<");
  });
});

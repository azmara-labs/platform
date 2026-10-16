// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Stepper } from "./stepper.js";

describe("Stepper renders on the server", () => {
  it("renders complete markup with no browser globals", () => {
    const html = expectServerSafe(
      <Stepper steps={[{ label: "One" }, { label: "Two" }]} current={1} />,
    );
    expect(html).toContain("<ol");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Completed");
  });
});

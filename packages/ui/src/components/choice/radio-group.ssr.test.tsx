// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { RadioGroup } from "./index.js";

describe("RadioGroup server-renders without browser globals", () => {
  it("renders the legend, the options, the form name and the chosen value", () => {
    const html = expectServerSafe(
      <RadioGroup
        label="Plan"
        name="plan"
        defaultValue="pro"
        required
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
        ]}
      />,
    );
    expect(html).toContain("Plan");
    expect(html).toContain("Free");
    expect(html).toContain('name="plan"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('aria-checked="true"');
  });

  it("escapes markup in labels, descriptions and values", () => {
    const html = expectServerSafe(
      <RadioGroup
        label={"<script>alert(1)</script>"}
        options={[
          { value: '"><img src=x onerror=alert(1)>', label: "<b>x</b>", description: "<i>y</i>" },
        ]}
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { CheckboxGroup } from "./index.js";

describe("CheckboxGroup server-renders without browser globals", () => {
  it("renders the legend, the options, the form name, the ticked values and select all", () => {
    const html = expectServerSafe(
      <CheckboxGroup
        label="Tags"
        name="tags"
        defaultValue={["b"]}
        selectAllLabel="Select all"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />,
    );
    expect(html).toContain("Tags");
    expect(html).toContain("Select all");
    expect(html).toContain('name="tags"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="mixed"');
  });

  it("escapes markup in labels, descriptions and values", () => {
    const html = expectServerSafe(
      <CheckboxGroup
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

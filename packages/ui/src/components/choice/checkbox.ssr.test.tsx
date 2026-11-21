// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Checkbox } from "./index.js";

describe("Checkbox server-renders without browser globals", () => {
  it("renders the label, the form name and aria-required", () => {
    const html = expectServerSafe(<Checkbox label="Accept the terms" name="terms" required />);
    expect(html).toContain("Accept the terms");
    expect(html).toContain('name="terms"');
    expect(html).toContain('aria-required="true"');
  });

  it("escapes markup in the label and the description", () => {
    const html = expectServerSafe(
      <Checkbox
        label={"<script>alert(1)</script>"}
        description={'"><img src=x onerror=alert(1)>'}
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });
});

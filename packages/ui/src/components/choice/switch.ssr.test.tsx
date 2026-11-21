// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Switch } from "./index.js";

describe("Switch server-renders without browser globals", () => {
  it("renders the label, the form name and the on state", () => {
    const html = expectServerSafe(<Switch label="Email me" name="notify" defaultChecked />);
    expect(html).toContain("Email me");
    expect(html).toContain('name="notify"');
    expect(html).toContain('aria-checked="true"');
  });

  it("escapes markup in the label", () => {
    const html = expectServerSafe(<Switch label={'"><img src=x onerror=alert(1)>'} />);
    expect(html).not.toContain("<img");
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/index.js";
import { LogoUpload } from "./logo-upload.js";

describe("LogoUpload: server rendering", () => {
  it("renders the empty control with no browser globals", () => {
    const html = expectServerSafe(<LogoUpload />);
    expect(html).toContain('type="file"');
    expect(html).toContain("Choose a logo");
    expect(html).not.toContain("<img");
  });

  it("renders the filled control with its preview", () => {
    const html = expectServerSafe(<LogoUpload defaultValue="data:image/webp;base64,QUJD" />);
    expect(html).toContain('type="file"');
    expect(html).toContain("<img");
    expect(html).toContain("Replace logo");
    expect(html).toContain("Remove logo");
  });
});

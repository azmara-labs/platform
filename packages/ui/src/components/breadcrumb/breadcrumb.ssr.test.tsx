// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Breadcrumbs } from "./breadcrumb.js";

describe("Breadcrumbs renders on the server", () => {
  it("renders complete markup with no browser globals", () => {
    const html = expectServerSafe(
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Projects", href: "/p" }, { label: "Now" }]}
        maxItems={5}
      />,
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/p"');
    expect(html).toContain('aria-current="page"');
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { ScrollArea } from "./scroll-area.js";

describe("ScrollArea server-renders without browser globals", () => {
  it("renders a named region with its content", () => {
    const html = expectServerSafe(
      <ScrollArea aria-label="Activity" className="h-24" orientation="both">
        <p>Item</p>
      </ScrollArea>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Activity"');
    expect(html).toContain("Item");
    expect(html).toContain('tabindex="0"');
  });
});

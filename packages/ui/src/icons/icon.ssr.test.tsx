// @vitest-environment node
import { Check } from "lucide-react";
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../test-utils/ssr.js";
import { Icon } from "./icon.js";
import { Icon as LucideSetIcon } from "./lucide.js";

describe("Icon server-renders without browser globals", () => {
  it("renders a decorative icon", () => {
    const html = expectServerSafe(<Icon icon={Check} />);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("size-4");
  });

  it("renders a labelled, spinning icon", () => {
    const html = expectServerSafe(<Icon icon={Check} aria-label="Saving" spin size="xl" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Saving"');
    expect(html).toContain("animate-spin");
    expect(html).toContain("size-6");
  });

  it("renders a named icon from the curated set", () => {
    expect(expectServerSafe(<LucideSetIcon name="search" />)).toContain("lucide-search");
  });
});

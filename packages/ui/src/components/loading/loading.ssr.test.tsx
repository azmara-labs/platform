// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Loading, Spinner } from "./index.js";

describe("Loading server-renders without browser globals (loading.tsx, Suspense fallbacks)", () => {
  it("renders each variant with its delay in CSS", () => {
    const page = expectServerSafe(<Loading variant="page" label="Loading invoices…" />);
    expect(page).toContain('role="status"');
    expect(page).toContain("Loading invoices…");
    expect(page).toContain("animation-delay:200ms");

    const logo = expectServerSafe(<Loading logo={<img src="/logo.svg" alt="" />} />);
    expect(logo).toContain('data-slot="loading-logo"');

    expect(expectServerSafe(<Spinner size="lg" delay={150} />)).toContain("animation-delay:150ms");
  });
});

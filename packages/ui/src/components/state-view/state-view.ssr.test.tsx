// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { StateView } from "./index.js";

describe("StateView server-renders without browser globals (loading.tsx, error.tsx)", () => {
  it("renders each state", () => {
    expect(expectServerSafe(<StateView state="loading" variant="page" />)).toContain(
      'role="status"',
    );
    expect(expectServerSafe(<StateView state="empty" title="No invoices" />)).toContain(
      "No invoices",
    );
    expect(expectServerSafe(<StateView state="error" />)).toContain('role="alert"');
  });
});

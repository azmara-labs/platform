// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Progress } from "./progress.js";

describe("Progress server-renders without browser globals", () => {
  it("renders linear, indeterminate and circular", () => {
    const html = expectServerSafe(
      <div>
        <Progress value={40} aria-label="Upload" />
        <Progress value={null} aria-label="Loading" />
        <Progress variant="circular" value={70} aria-label="Quota" />
      </div>,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="40"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("stroke-dasharray");
  });
});

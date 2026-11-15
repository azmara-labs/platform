// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/index.js";
import { createTheme } from "../../theme/index.js";
import { ThemePreview } from "./theme-preview.js";

describe("ThemePreview: server rendering", () => {
  it("renders with no browser globals", () => {
    const html = expectServerSafe(
      <ThemePreview cssVariables={createTheme({ brand: "#1d4ed8" }).cssVariables} mode="light" />,
    );
    expect(html).toContain('data-slot="theme-preview"');
    expect(html).toContain("inert");
  });
});

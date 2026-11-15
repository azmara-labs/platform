// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/index.js";
import { ThemeStudio } from "./theme-studio.js";

describe("ThemeStudio: server rendering", () => {
  it("renders with no browser globals", () => {
    const html = expectServerSafe(<ThemeStudio onSave={() => {}} />);
    expect(html).toContain("App name");
    expect(html).toContain("Save branding");
    expect(html).toContain('data-slot="theme-preview"');
  });

  it("renders a conflict from the first paint", () => {
    const html = expectServerSafe(
      <ThemeStudio
        value={{ version: 1, brand: "#ffee00", light: { "primary-foreground": "#ffffff" } }}
        onSave={() => {}}
      />,
    );
    expect(html).toContain("A setting made by a developer conflicts");
  });
});

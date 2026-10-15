import * as lucide from "lucide-react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../test-utils/index.js";
import { Icon, iconNames, lucideIcons } from "./lucide.js";

const pascal = (kebab: string) =>
  kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

describe("curated Lucide set", () => {
  it("covers the icons the components and common UI need", () => {
    for (const name of [
      "check",
      "chevron-down",
      "chevron-up",
      "chevron-left",
      "chevron-right",
      "chevrons-up-down",
      "x",
      "search",
      "plus",
      "minus",
      "calendar",
      "eye",
      "eye-off",
      "info",
      "circle-alert",
      "triangle-alert",
      "circle-check",
      "circle-x",
      "loader-circle",
      "arrow-up",
      "arrow-down",
      "arrow-left",
      "arrow-right",
      "ellipsis",
      "ellipsis-vertical",
      "grip-vertical",
      "panel-left",
    ]) {
      expect(iconNames, name).toContain(name);
    }
    expect(iconNames.length).toBeGreaterThanOrEqual(40);
  });

  it("uses Lucide's own kebab-case names, each tied to a real Lucide export", () => {
    for (const [name, component] of Object.entries(lucideIcons)) {
      expect(name, name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const exported = (lucide as unknown as Record<string, unknown>)[pascal(name)];
      expect(exported, `${name} -> ${pascal(name)}`).toBe(component);
    }
  });

  it("renders by name with the shared Icon API", async () => {
    const { container } = renderUi(<Icon name="check" size="lg" aria-label="Done" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("lucide-check");
    expect(svg?.getAttribute("class")).toContain("size-5");
    await expectNoA11yViolations(container);
  });

  it("has no duplicate component under two names", () => {
    const components = Object.values(lucideIcons);
    expect(new Set(components).size).toBe(components.length);
  });
});

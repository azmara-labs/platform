// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { groupId } from "../lib/component-index";
import { COMPONENT_GROUPS, COMPONENT_STATUSES } from "../lib/component-taxonomy";
import { ComponentMeta } from "./component-meta";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLElement | undefined;
let root: Root | undefined;

async function render(
  group: (typeof COMPONENT_GROUPS)[number],
  status: (typeof COMPONENT_STATUSES)[number],
) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<ComponentMeta group={group} status={status} since="0.2.0" />);
  });
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

describe("ComponentMeta", () => {
  it("shows the status, the group and the version that introduced the component", async () => {
    const el = await render("Data display", "new");
    expect(el.textContent).toContain("New");
    expect(el.textContent).toContain("Group: Data display");
    expect(el.textContent).toContain("Added in @azmr/ui 0.2.0");
  });

  it("links the group to its section on the index and the version to the package changelog", async () => {
    const el = await render("Data display", "stable");
    const hrefs = Array.from(el.querySelectorAll("a"), (a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/docs/components#group-data-display", "/docs/changelog/ui"]);
  });

  it("says each status in words, so it never relies on colour", async () => {
    for (const status of COMPONENT_STATUSES) {
      const el = await render("Layout", status);
      expect(el.textContent?.toLowerCase()).toContain(status);
      await act(async () => root?.unmount());
      host?.remove();
    }
  });

  it("is accessible (axe) and labelled as a list", async () => {
    const el = await render("Inputs", "beta");
    expect(el.querySelector("ul")?.getAttribute("aria-label")).toBe("About this component");
    const result = await axe.run(el);
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("the links ComponentMeta makes", () => {
  it("point at section ids that the component index really has", () => {
    const grid = readFileSync(join(import.meta.dirname, "component-grid.tsx"), "utf8");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source code quoted as text
    expect(grid).toContain("`group-${groupId(entry.group)}`");
    for (const group of COMPONENT_GROUPS) expect(groupId(group)).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("are used on the docs page for every component page", () => {
    const page = readFileSync(
      join(import.meta.dirname, "..", "app", "docs", "[[...slug]]", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("<ComponentMeta");
    expect(page).toContain("page.data.since");
  });
});

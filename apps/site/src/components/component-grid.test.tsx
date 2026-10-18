// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { ComponentItem } from "../lib/component-index";
import { componentFrontmatter } from "../lib/docs-frontmatter";
import { ComponentGrid } from "./component-grid";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const componentsDir = join(import.meta.dirname, "..", "..", "content", "docs", "components");

/** Every component page's frontmatter, the same data the build gives the index. */
function itemsFromContent(): ComponentItem[] {
  return readdirSync(componentsDir)
    .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
    .map((file) => {
      const text = readFileSync(join(componentsDir, file), "utf8");
      const data = componentFrontmatter.parse(
        parse(/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? ""),
      );
      return {
        title: data.title,
        description: data.description,
        url: `/docs/components/${file.replace(/\.mdx$/, "")}`,
        group: data.group,
        status: data.status,
        since: data.since,
      };
    });
}

let host: HTMLElement | undefined;
let root: Root | undefined;

async function render(items: ComponentItem[]) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<ComponentGrid items={items} />);
  });
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

const links = (el: HTMLElement) =>
  Array.from(el.querySelectorAll("a"), (a) => a.getAttribute("href"));
const headings = (el: HTMLElement) =>
  Array.from(el.querySelectorAll("section > h3"), (h) => h.textContent);
const click = async (el: Element | undefined) => {
  await act(async () => {
    (el as HTMLElement).click();
  });
};

describe("ComponentGrid with the real component pages", () => {
  const items = itemsFromContent();

  it("lists every component page once, as a link to it", async () => {
    const el = await render(items);
    expect(items.length).toBeGreaterThan(15);
    expect(links(el).sort()).toEqual(items.map((i) => i.url).sort());
  });

  it("groups them under headings in the schema's order, and shows each status", async () => {
    const el = await render(items);
    const expected = [
      "Layout",
      "Inputs",
      "Data display",
      "Feedback",
      "Overlays",
      "Navigation",
      "Utils",
    ];
    expect(headings(el)).toEqual(expected.filter((g) => items.some((i) => i.group === g)));
    const badges = el.textContent ?? "";
    expect(badges).toContain("Stable");
    expect(badges).toContain("New");
  });

  it("filters by group with the buttons, marking the active one", async () => {
    const el = await render(items);
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("fieldset button"));
    expect(buttons[0]?.textContent).toBe("All");
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
    const overlays = buttons.find((b) => b.textContent === "Overlays");
    await click(overlays);
    expect(overlays?.getAttribute("aria-pressed")).toBe("true");
    expect(headings(el)).toEqual(["Overlays"]);
    expect(links(el).sort()).toEqual(
      items
        .filter((i) => i.group === "Overlays")
        .map((i) => i.url)
        .sort(),
    );
    expect(el.querySelector('[role="status"]')?.textContent).toMatch(/^\d+ components$/);
  });

  it("filters by text and says so when nothing matches", async () => {
    const el = await render(items);
    const input = el.querySelector("input") as HTMLInputElement;
    const setValue = async (value: string) => {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    await setValue("toast");
    expect(links(el)).toEqual(["/docs/components/toast"]);
    expect(el.querySelector('[role="status"]')?.textContent).toBe("1 component");
    await setValue("zzzz-no-such-component");
    expect(links(el)).toEqual([]);
    expect(el.textContent).toContain("No components match");
  });

  it("is accessible (axe), unfiltered and filtered", async () => {
    const el = await render(items);
    const run = async () => {
      const result = await axe.run(el);
      return result.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`);
    };
    expect(await run()).toEqual([]);
    await click(Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Inputs"));
    expect(await run()).toEqual([]);
  });
});

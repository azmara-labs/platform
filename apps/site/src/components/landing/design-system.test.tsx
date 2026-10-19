// @vitest-environment jsdom
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DesignSystem } from "./design-system";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLElement | undefined;
let root: Root | undefined;

async function render(componentCount: number) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<DesignSystem componentCount={componentCount} />);
  });
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

describe("DesignSystem landing section", () => {
  it("states the component count it is given", async () => {
    const el = await render(22);
    expect(el.textContent).toContain("22 components with live demos");
  });

  it("links to the component index and the Why @azmr/ui guide", async () => {
    const el = await render(22);
    const hrefs = [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/docs/components", "/docs/guide/why-azmr-ui"]);
  });

  it("previews real @azmr/ui components: a stepper, a table and an alert", async () => {
    const el = await render(22);
    expect(el.querySelector('ol[aria-label="Invoice progress"]')).not.toBeNull();
    expect(el.querySelectorAll("table tbody tr")).toHaveLength(3);
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("has no accessibility violations", async () => {
    const el = await render(22);
    const { violations } = await axe.run(el);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

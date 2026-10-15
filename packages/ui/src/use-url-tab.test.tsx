import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderUi } from "./test-utils/index.js";
import { useUrlTab } from "./use-url-tab.js";

const VALUES = ["overview", "billing", "team"] as const;
type Tab = (typeof VALUES)[number];

let latest: { value: Tab; set: (next: Tab) => void } | undefined;

function Probe(props: { param?: string; history?: "replace" | "push"; id?: string }) {
  const [value, set] = useUrlTab({
    param: props.param,
    values: VALUES,
    defaultValue: "overview",
    history: props.history,
  });
  latest = { value, set };
  return <output data-testid={props.id ?? "v"}>{value}</output>;
}

const out = (container: HTMLElement, id = "v") =>
  container.querySelector(`[data-testid=${id}]`)?.textContent;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  latest = undefined;
});
afterEach(() => window.history.replaceState(null, "", "/"));

describe("useUrlTab: reading", () => {
  it("is the default when the URL has no tab", () => {
    const { container } = renderUi(<Probe />);
    expect(out(container)).toBe("overview");
  });

  it("reads a valid tab from the URL", () => {
    window.history.replaceState(null, "", "/?tab=billing");
    const { container } = renderUi(<Probe />);
    expect(out(container)).toBe("billing");
  });

  it("ignores a value that is not in the allowed list (the URL is untrusted input)", () => {
    for (const bad of [
      "<script>alert(1)</script>",
      "constructor",
      "__proto__",
      "BILLING",
      "",
      "billing ",
      "../x",
    ]) {
      window.history.replaceState(null, "", `/?tab=${encodeURIComponent(bad)}`);
      const { container } = renderUi(<Probe />);
      expect(out(container), bad).toBe("overview");
    }
  });

  it("uses the first value when the parameter is repeated", () => {
    window.history.replaceState(null, "", "/?tab=team&tab=billing");
    const { container } = renderUi(<Probe />);
    expect(out(container)).toBe("team");
  });

  it("supports another parameter name", () => {
    window.history.replaceState(null, "", "/?section=team");
    const { container } = renderUi(<Probe param="section" />);
    expect(out(container)).toBe("team");
  });
});

describe("useUrlTab: writing", () => {
  it("updates the URL and the value, keeping other parameters and the hash", () => {
    window.history.replaceState(null, "", "/page?filter=open#details");
    const { container } = renderUi(<Probe />);
    act(() => latest?.set("billing"));
    expect(out(container)).toBe("billing");
    expect(window.location.search).toBe("?filter=open&tab=billing");
    expect(window.location.hash).toBe("#details");
    expect(window.location.pathname).toBe("/page");
  });

  it("replaces history by default (no back-button trap on every tab click)", () => {
    const before = window.history.length;
    renderUi(<Probe />);
    act(() => latest?.set("billing"));
    act(() => latest?.set("team"));
    expect(window.history.length).toBe(before);
  });

  it("can push history entries instead", () => {
    const before = window.history.length;
    renderUi(<Probe history="push" />);
    act(() => latest?.set("billing"));
    expect(window.history.length).toBe(before + 1);
  });

  it("removes the parameter when set back to the default, so URLs stay clean", () => {
    window.history.replaceState(null, "", "/?tab=team&x=1");
    renderUi(<Probe />);
    act(() => latest?.set("overview"));
    expect(window.location.search).toBe("?x=1");
  });

  it("refuses a value that is not allowed", () => {
    renderUi(<Probe />);
    expect(() => latest?.set("evil" as Tab)).toThrow(TypeError);
    expect(window.location.search).toBe("");
  });

  it("keeps a stable setter across renders", () => {
    const { rerender } = renderUi(<Probe />);
    const first = latest?.set;
    rerender(<Probe />);
    expect(latest?.set).toBe(first);
  });
});

describe("useUrlTab: following the browser", () => {
  it("updates on popstate (back and forward)", () => {
    const { container } = renderUi(<Probe />);
    act(() => {
      window.history.replaceState(null, "", "/?tab=team");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(out(container)).toBe("team");
  });

  it("two hooks on the same parameter stay in sync", () => {
    const { container } = renderUi(
      <div>
        <Probe id="a" />
        <Probe id="b" />
      </div>,
    );
    act(() => latest?.set("billing"));
    expect(out(container, "a")).toBe("billing");
    expect(out(container, "b")).toBe("billing");
  });

  it("hooks on different parameters are independent", () => {
    const { container } = renderUi(
      <div>
        <Probe id="a" param="tab" />
        <Probe id="b" param="section" />
      </div>,
    );
    act(() => latest?.set("team")); // `latest` is the last rendered probe: section
    expect(out(container, "b")).toBe("team");
    expect(out(container, "a")).toBe("overview");
    expect(window.location.search).toBe("?section=team");
  });

  it("stops listening when unmounted", () => {
    const { unmount } = renderUi(<Probe />);
    unmount();
    expect(() => window.dispatchEvent(new PopStateEvent("popstate"))).not.toThrow();
  });
});

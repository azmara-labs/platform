// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe, renderServer } from "./ssr.js";

// Server-safe entries must render with no browser globals. This file opts into the
// node environment, where `window` and `document` genuinely do not exist.
function Pure({ label }: { label: string }) {
  return <p className="text-foreground">{label}</p>;
}

function TouchesWindowDuringRender() {
  return (
    <p>{(globalThis as { window?: { innerWidth: number } }).window?.innerWidth ?? "no window"}</p>
  );
}

function ThrowsWithoutWindow() {
  // a bare reference throws a ReferenceError on the server
  return <p>{String(window.innerWidth)}</p>;
}

describe("SSR helpers (node environment)", () => {
  it("has no browser globals in this file", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renderServer returns the HTML string", () => {
    expect(renderServer(<Pure label="hi" />)).toBe('<p class="text-foreground">hi</p>');
  });

  it("expectServerSafe passes a component that needs no browser APIs", () => {
    expect(expectServerSafe(<Pure label="ok" />)).toContain("ok");
  });

  it("expectServerSafe tolerates optional access guarded by a check", () => {
    expect(expectServerSafe(<TouchesWindowDuringRender />)).toContain("no window");
  });

  it("expectServerSafe fails loudly for a component that reads window while rendering", () => {
    expect(() => expectServerSafe(<ThrowsWithoutWindow />)).toThrow(/server-safe|window/i);
  });
});

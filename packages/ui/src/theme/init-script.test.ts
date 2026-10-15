import { describe, expect, it } from "vitest";
import { themeInitScript } from "./init-script.js";

// Run the generated script against a fake document, as a browser would.
function run(cookie: string | undefined) {
  const attributes = new Map<string, string>();
  const fakeDocument = {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    },
  };
  new Function("document", themeInitScript())(fakeDocument);
  return Object.fromEntries(attributes);
}

describe("themeInitScript", () => {
  it("returns a self-contained script with no external references", () => {
    const script = themeInitScript();
    expect(typeof script).toBe("string");
    expect(script).not.toMatch(/import |require\(|fetch\(|XMLHttpRequest|eval\(|innerHTML/);
  });

  it("applies a stored theme and density from the cookie", () => {
    expect(run("azmr-theme=dark; azmr-density=compact")).toEqual({
      "data-theme": "dark",
      "data-density": "compact",
    });
  });

  it("leaves system and comfortable (the CSS defaults) alone", () => {
    expect(run("azmr-theme=system; azmr-density=comfortable")).toEqual({});
  });

  it("ignores missing, malformed and hostile values", () => {
    expect(run(undefined)).toEqual({});
    expect(run("")).toEqual({});
    expect(run("azmr-theme=<script>alert(1)</script>; azmr-density=huge")).toEqual({});
    expect(run("azmr-theme=dark%3Bevil")).toEqual({});
    expect(run("x-azmr-theme=dark")).toEqual({});
  });

  it("never throws, even if the document is unusable", () => {
    expect(() => new Function("document", themeInitScript())({})).not.toThrow();
    expect(() => new Function("document", themeInitScript())(undefined)).not.toThrow();
  });
});

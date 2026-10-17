import { describe, expect, it } from "vitest";
import { anchors, checkLinks, extractLinks, stripCode } from "./content-links";

const routes = new Set(["/", "/docs", "/docs/guide/installation", "/docs/components/button"]);
const pages = new Map([
  [
    "/docs/guide/installation",
    "# Installation\n\n## Native module note\n\n## Setup {#custom-setup}\n",
  ],
  [
    "/docs/components/button",
    "# Button\n\n## Usage\n\n```tsx\n## not a heading\n```\n\n## Usage\n",
  ],
]);

describe("stripCode", () => {
  it("removes fenced and inline code but keeps the prose around it", () => {
    const text = "See [a](/docs)\n\n```md\n[b](/nope)\n```\n\nand `[c](/nope)` end";
    expect(stripCode(text)).not.toContain("/nope");
    expect(stripCode(text)).toContain("[a](/docs)");
  });
});

describe("extractLinks", () => {
  it("finds markdown links, links with a title, and href attributes", () => {
    const text = '[a](/docs/one) [b](/docs/two "Title") <a href="/docs/three">x</a>';
    expect(extractLinks(text)).toEqual(["/docs/one", "/docs/two", "/docs/three"]);
  });

  it("ignores links inside code", () => {
    expect(extractLinks("```\n[x](/docs/nope)\n```\n`[y](/docs/nope)`")).toEqual([]);
  });
});

describe("anchors", () => {
  it("slugs headings the way Fumadocs does and honours explicit ids", () => {
    const ids = anchors(pages.get("/docs/guide/installation") as string);
    expect(ids.has("installation")).toBe(true);
    expect(ids.has("native-module-note")).toBe(true);
    expect(ids.has("custom-setup")).toBe(true);
  });

  it("ignores headings inside code fences and numbers repeated headings", () => {
    const ids = anchors(pages.get("/docs/components/button") as string);
    expect(ids.has("not-a-heading")).toBe(false);
    expect(ids.has("usage")).toBe(true);
    expect(ids.has("usage-1")).toBe(true);
  });

  it("reads the text of a heading with inline code or a link", () => {
    expect(anchors("## The `createTheme` [guide](/docs)\n").has("the-createtheme-guide")).toBe(
      true,
    );
  });
});

describe("checkLinks", () => {
  const check = (links: string[], current = "/docs/components/button") =>
    checkLinks("components/button.mdx", links, routes, pages, current);

  it("accepts links to pages and to real anchors", () => {
    expect(check(["/docs", "/docs/guide/installation#native-module-note", "/", "#usage"])).toEqual(
      [],
    );
  });

  it("accepts a trailing slash and a query string", () => {
    expect(
      check(["/docs/guide/installation/", "/docs/guide/installation?x=1#installation"]),
    ).toEqual([]);
  });

  it("reports a page that does not exist", () => {
    expect(check(["/docs/components/missing"]).map((b) => b.reason)).toEqual(["no such page"]);
  });

  it("reports an anchor that does not exist, on another page and on the same page", () => {
    const broken = check(["/docs/guide/installation#nope", "#also-nope"]);
    expect(broken.map((b) => b.link)).toEqual(["/docs/guide/installation#nope", "#also-nope"]);
    expect(broken[0]?.reason).toContain("no heading or id");
  });

  it("reports relative links, which cannot be resolved without the page's URL", () => {
    expect(check(["./button"]).map((b) => b.reason)[0]).toContain("relative link");
  });

  it("leaves external and mailto links alone", () => {
    expect(check(["https://base-ui.com", "mailto:a@b.co", "//cdn.example.com/x"])).toEqual([]);
  });
});

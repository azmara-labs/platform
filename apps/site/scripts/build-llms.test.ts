import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createGenerator } from "fumadocs-typescript";
import { beforeAll, describe, expect, it } from "vitest";
import { markdownUrl } from "../src/lib/markdown-url";
import {
  type DocPage,
  type RenderContext,
  readPages,
  renderLlmsFull,
  renderLlmsTxt,
  renderPage,
  SITE_URL,
  toMarkdown,
} from "./build-llms.mjs";

const siteDir = join(import.meta.dirname, "..");
const contentDir = join(siteDir, "content", "docs");

function mdxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) mdxFiles(full, out);
    else if (entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

const withoutFences = (markdown: string) => markdown.replace(/^```[\s\S]*?^```/gm, "");

describe("markdownUrl", () => {
  it("adds .md to a page's address, and gives the docs home an index file", () => {
    expect(markdownUrl("/docs/components/button")).toBe("/docs/components/button.md");
    expect(markdownUrl("/docs")).toBe("/docs/index.md");
    expect(markdownUrl("/docs/")).toBe("/docs/index.md");
  });
});

describe("readPages", () => {
  const pages = readPages(contentDir);

  it("finds every MDX page, once (guards against scanning nothing)", () => {
    expect(pages.length).toBe(mdxFiles(contentDir).length);
    expect(pages.length).toBeGreaterThan(40);
    expect(new Set(pages.map((p) => p.url)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.markdownPath)).size).toBe(pages.length);
  });

  it("puts the docs home first and follows the sidebar order", () => {
    expect(pages[0]?.url).toBe("/docs");
    const at = (url: string) => pages.findIndex((p) => p.url === url);
    expect(at("/docs/guide/introduction")).toBeLessThan(at("/docs/guide/installation"));
    expect(at("/docs/guide/installation")).toBeLessThan(at("/docs/components"));
    expect(at("/docs/components/button")).toBeLessThan(at("/docs/components/menu"));
    expect(at("/docs/components")).toBeLessThan(at("/docs/packages/core"));
  });

  it("names each page's section from its folder's meta.json", () => {
    const sections = new Set(pages.map((p) => p.section));
    for (const expected of ["Overview", "Guide", "Components", "Changelog"]) {
      expect(sections.has(expected), expected).toBe(true);
    }
  });
});

describe("toMarkdown", () => {
  const pages: DocPage[] = [
    {
      slugs: ["guide", "theming"],
      url: "/docs/guide/theming",
      markdownPath: "docs/guide/theming.md",
      title: "Theming",
      description: "",
      section: "Guide",
      file: "theming.mdx",
      body: "",
    },
  ];
  const ctx: RenderContext = {
    generator: createGenerator({ tsconfigPath: join(siteDir, "tsconfig.json") }),
    pages,
  };
  const run = (mdx: string) => toMarkdown(mdx, ctx, "test");

  it("writes a Demo as the source of that demo", async () => {
    const md = await run('<Demo name="button/variants" />');
    expect(md).toContain("```tsx");
    expect(md).toContain("export default function ButtonVariants");
    expect(md).not.toContain("<Demo");
  });

  it("rejects a Demo name that is not a demo", async () => {
    await expect(run('<Demo name="../../package" />')).rejects.toThrow(/unknown demo/);
  });

  it("writes a KeyboardMap as a table, with alternative keys joined by 'or'", async () => {
    const md = await run(
      '<KeyboardMap rows={[{ keys: ["Enter", "Space"], action: "Activates." }]} />',
    );
    expect(md).toMatch(/\| Key\s+\| Action\s+\|/);
    expect(md).toContain("`Enter` or `Space`");
    expect(md).toContain("Activates.");
  });

  it("does not run code in a KeyboardMap", async () => {
    await expect(run("<KeyboardMap rows={[process.exit(1)]} />")).rejects.toThrow();
  });

  it("writes a Callout as a quote with its title", async () => {
    const md = await run('<Callout type="warning" title="Careful">\n  Mind the gap.\n</Callout>');
    expect(md).toContain("> **Careful**");
    expect(md).toContain("> Mind the gap.");
  });

  it("drops imports, comments and decorative components, and keeps the prose", async () => {
    const md = await run(
      'import { X } from "x";\n\n{/* a comment */}\n\nText <TokenSwatch light="red" dark="blue" /> more.\n',
    );
    expect(md).toBe("Text  more.");
  });

  it("fails on a component or expression it has no Markdown form for, so nothing leaks through", async () => {
    await expect(run("<Mystery />")).rejects.toThrow(/<Mystery> has no Markdown form/);
    await expect(run("Value {1 + 1}")).rejects.toThrow(/cannot be written as Markdown/);
  });

  it("keeps the code fence's language but drops the example=… result=… meta", async () => {
    const md = await run("```ts example=one result=value\nconst value = 1;\n```");
    expect(md).toBe("```ts\nconst value = 1;\n```");
  });

  it("makes links absolute, pointing docs pages at their Markdown and keeping the anchor", async () => {
    const md = await run(
      "[a](/docs/guide/theming#reduced-motion) [b](/playground) [c](https://example.com/x)",
    );
    expect(md).toContain(`(${SITE_URL}/docs/guide/theming.md#reduced-motion)`);
    expect(md).toContain(`(${SITE_URL}/playground)`);
    expect(md).toContain("(https://example.com/x)");
  });

  it("writes a props table with the allowed values of an enum-style prop", async () => {
    const md = await run(
      '<AutoTypeTable path="../../packages/ui/src/components/button/button.tsx" name="ButtonOwnProps" />',
    );
    expect(md).toMatch(/\| Prop\s+\| Type\s+\| Default\s+\| Required\s+\| Description\s+\|/);
    expect(md).toMatch(/\| `variant`\s+\| `"default" \\\| "secondary"/);
    expect(md).toContain("`destructive` for irreversible ones");
    expect(md).not.toContain("\\`");
  }, 60_000);
});

describe("the Markdown for the real docs", () => {
  const pages = readPages(contentDir);
  const ctx: RenderContext = {
    generator: createGenerator({ tsconfigPath: join(siteDir, "tsconfig.json") }),
    pages,
  };
  const rendered: { page: DocPage; markdown: string }[] = [];

  beforeAll(async () => {
    for (const page of pages) rendered.push({ page, markdown: await renderPage(page, ctx) });
  }, 180_000);

  const get = (url: string) => rendered.find((r) => r.page.url === url)?.markdown ?? "";

  it("renders every page, with its title, description and source address", () => {
    expect(rendered.length).toBe(pages.length);
    for (const { page, markdown } of rendered) {
      expect(markdown, page.url).toMatch(
        new RegExp(`^# ${page.title.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}\n`),
      );
      expect(markdown, page.url).toContain(`Source: ${SITE_URL}${page.url}\n`);
    }
  });

  it("leaves no MDX component, import or comment behind", () => {
    for (const { page, markdown } of rendered) {
      const prose = withoutFences(markdown);
      expect(prose, page.url).not.toMatch(
        /<(Demo|AutoTypeTable|KeyboardMap|Callout|ComponentIndex|PackageIndex|TokenSwatch|ElevationSample)\b/,
      );
      expect(prose, page.url).not.toContain("{/*");
      expect(prose, page.url).not.toMatch(/^import .* from /m);
    }
  });

  it("leaves no link that only works on the docs site (every link is absolute)", () => {
    for (const { page, markdown } of rendered) {
      const prose = withoutFences(markdown);
      expect(
        [...prose.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]),
        page.url,
      ).toEqual([]);
    }
  });

  it("includes the source of every demo on every page", () => {
    let demos = 0;
    for (const { page, markdown } of rendered) {
      for (const m of page.body.matchAll(/<Demo\s+name="([^"]+)"/g)) {
        const demo = readFileSync(join(siteDir, "src", "demos", `${m[1]}.demo.tsx`), "utf8").trim();
        expect(markdown, `${page.url} ${m[1]}`).toContain(demo);
        demos++;
      }
    }
    expect(demos).toBeGreaterThan(50);
  });

  it("includes the API tables: a Props table on every page that has a props table", () => {
    const withTables = rendered.filter(({ page }) => /<AutoTypeTable/.test(page.body));
    expect(withTables.length).toBeGreaterThan(15);
    for (const { page, markdown } of withTables) {
      expect(markdown, page.url).toMatch(
        /\| Prop\s+\| Type\s+\| Default\s+\| Required\s+\| Description\s+\|/,
      );
    }
    expect(get("/docs/components/button")).toMatch(/\| `loadingText`\s+\| `ReactNode`/);
  });

  it("includes every interactive component's key map", () => {
    const menu = get("/docs/components/menu");
    expect(menu).toMatch(/\| Key\s+\| Action\s+\|/);
    expect(menu).toContain("`Escape`");
  });

  it("lists every component and package on the index pages", () => {
    const components = get("/docs/components");
    for (const slug of ["button", "menu", "toast", "table"]) {
      expect(components).toContain(`${SITE_URL}/docs/components/${slug}.md`);
    }
    const packages = get("/docs/packages");
    for (const name of ["@azmr/core", "@azmr/ui", "@azmr/db-core-interface"]) {
      expect(packages).toContain(name);
    }
  });

  describe("llms.txt", () => {
    const txt = renderLlmsTxt(pages);
    const published = new Set(pages.map((p) => `${SITE_URL}/${p.markdownPath}`));

    it("follows the llms.txt layout: a title, a summary quote, then sections of links", () => {
      const lines = txt.split("\n");
      expect(lines[0]).toBe("# Azmara Platform");
      expect(lines[2]).toMatch(/^> .+/);
      expect(txt).toMatch(/^## Guide$/m);
      expect(txt).toMatch(/^## Components$/m);
      expect(txt).toMatch(/^## Optional$/m);
      expect(txt).toContain(`${SITE_URL}/llms-full.txt`);
    });

    it("links every page once, each to a Markdown file that is written", () => {
      const links = [...txt.matchAll(/\]\((https:\/\/[^)]+\.md)\)/g)].map((m) => m[1] as string);
      expect(links.length).toBe(pages.length);
      expect(new Set(links).size).toBe(pages.length);
      for (const link of links) expect(published.has(link), link).toBe(true);
    });

    it("keeps the changelogs under Optional, so an assistant can skip them", () => {
      const optional = txt.slice(txt.indexOf("## Optional"));
      const changelogs = pages.filter((p) => p.section === "Changelog");
      expect(changelogs.length).toBeGreaterThan(5);
      for (const page of changelogs) expect(optional).toContain(page.markdownPath);
      expect(txt.slice(0, txt.indexOf("## Optional"))).not.toContain("docs/changelog/");
    });
  });

  describe("llms-full.txt", () => {
    it("has every page except the changelogs, in order, and is a single readable file", () => {
      const full = renderLlmsFull(rendered);
      const included = rendered.filter(({ page }) => page.section !== "Changelog");
      let at = -1;
      for (const { page } of included) {
        const next = full.indexOf(`Source: ${SITE_URL}${page.url}\n`, at + 1);
        expect(next, page.url).toBeGreaterThan(at);
        at = next;
      }
      expect(full).not.toContain("Source: https://platform.azmara.io/docs/changelog");
      expect(full.length).toBeGreaterThan(100_000);
    });
  });
});

describe("the build runs the generator", () => {
  it("regenerates llms.txt on every production build, and the outputs are not committed", () => {
    const pkg = JSON.parse(readFileSync(join(siteDir, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["generate:llms"]).toContain("build-llms");
    expect(pkg.scripts.prebuild).toContain("generate:llms");

    const ignore = readFileSync(join(siteDir, "..", "..", ".gitignore"), "utf8");
    for (const entry of [
      "apps/site/public/llms.txt",
      "apps/site/public/llms-full.txt",
      "apps/site/public/docs/",
    ]) {
      expect(ignore.split("\n"), entry).toContain(entry);
    }
  });

  it("gives each docs page a link to its Markdown version", () => {
    const page = readFileSync(
      join(siteDir, "src", "app", "docs", "[[...slug]]", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("markdownUrl(page.url)");
    expect(page).toContain('"text/markdown"');
  });
});

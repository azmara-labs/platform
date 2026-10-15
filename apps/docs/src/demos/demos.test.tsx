// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import axe from "axe-core";
import { act, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { isDemoName } from "../lib/demo-name";
import { demos } from "./registry";

// The demo runner: every demo on the docs site is rendered here, so a demo that stops compiling,
// throws, or becomes inaccessible fails the build instead of rotting on a published page.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const demosDir = import.meta.dirname;
const contentDir = join(demosDir, "..", "..", "content", "docs");

function walk(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match.test(entry)) out.push(full);
  }
  return out;
}

const demoFiles = walk(demosDir, /\.demo\.tsx$/);
const fileNames = demoFiles.map((f) =>
  relative(demosDir, f)
    .replaceAll("\\", "/")
    .replace(/\.demo\.tsx$/, ""),
);
const registered = Object.keys(demos);

describe("demo registry", () => {
  it("finds the demo files (guards against scanning nothing)", () => {
    expect(fileNames.length).toBeGreaterThanOrEqual(5);
  });

  it("registers exactly the demo files that exist: no orphan files, no dangling entries", () => {
    expect([...registered].sort()).toEqual([...fileNames].sort());
  });

  it("uses valid demo names (group/name, kebab-case)", () => {
    for (const name of registered) expect(isDemoName(name), name).toBe(true);
  });
});

describe("demos are referenced from the docs", () => {
  const mdxFiles = walk(contentDir, /\.mdx$/);
  const references = new Map<string, string[]>();
  for (const file of mdxFiles) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/<Demo\s+name="([^"]+)"/g)) {
      const name = match[1] as string;
      references.set(name, [...(references.get(name) ?? []), relative(contentDir, file)]);
    }
  }

  it("finds the MDX pages (guards against scanning nothing)", () => {
    expect(mdxFiles.length).toBeGreaterThan(5);
    expect(references.size).toBeGreaterThan(0);
  });

  it("every <Demo name> in the content exists in the registry", () => {
    const dangling = [...references.keys()].filter((name) => !registered.includes(name));
    expect(dangling).toEqual([]);
  });

  it("every registered demo is used by at least one page", () => {
    const unused = registered.filter((name) => !references.has(name));
    expect(unused).toEqual([]);
  });
});

describe("demo sources show the public API", () => {
  const allowed = [/^react$/, /^@azmr\/(ui|core)(\/[\w./-]+)?$/, /^lucide-react$/];

  it.each(demoFiles.map((f) => [relative(demosDir, f).replaceAll("\\", "/"), f]))(
    "%s imports only public packages",
    (_name, file) => {
      const source = readFileSync(file as string, "utf8");
      const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (m) => m[1] as string,
      );
      const bad = specifiers.filter((s) => !allowed.some((re) => re.test(s)));
      expect(bad, "a reader must be able to copy a demo into their own app").toEqual([]);
    },
  );
});

describe("every demo renders and is accessible", () => {
  let host: HTMLElement | undefined;
  afterEach(() => {
    host?.remove();
    host = undefined;
  });

  it.each(Object.entries(demos))("%s", async (_name, Demo) => {
    const Component = Demo as ComponentType;
    host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<Component />);
    });

    expect(host.innerHTML.length, "the demo rendered nothing").toBeGreaterThan(0);

    // jsdom has no layout engine, so colour contrast is covered by the token tests instead.
    const results = await axe.run(host, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    const report = results.violations
      .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")})`)
      .join("\n");
    expect(report).toBe("");

    await act(async () => {
      root.unmount();
    });
  });
});

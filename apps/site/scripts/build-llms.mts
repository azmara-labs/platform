import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGenerator, type DocEntry, type Generator } from "fumadocs-typescript";
import type {
  BlockContent,
  Code,
  Content,
  Paragraph,
  PhrasingContent,
  Root,
  Table,
  TableCell,
  TableRow,
} from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { parse as parseYaml } from "yaml";
import { COMPONENT_GROUPS } from "../src/lib/component-taxonomy";
import { demoSourcePath, isDemoName } from "../src/lib/demo-name";
import { fixtureFilePath, fixturesRoot, isFixtureFile, languageOf } from "../src/lib/fixture-file";
import { markdownUrl } from "../src/lib/markdown-url";
import { readPackages } from "../src/lib/package-index";
import { parseLiteral } from "./build-accessibility";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(SITE_DIR, "content", "docs");
const DEMOS_DIR = path.join(SITE_DIR, "src", "demos");
const PACKAGES_DIR = path.resolve(SITE_DIR, "..", "..", "packages");
const PUBLIC_DIR = path.join(SITE_DIR, "public");

export const SITE_URL = "https://platform.azmara.io";

export interface DocPage {
  /** Path segments under /docs, e.g. ["components", "button"]. Empty for the docs home. */
  slugs: string[];
  /** The page's address on the site, e.g. "/docs/components/button". */
  url: string;
  /** Where the Markdown version is published, relative to public/, e.g. "docs/components/button.md". */
  markdownPath: string;
  title: string;
  description: string;
  /** The sidebar section the page belongs to, e.g. "Components". */
  section: string;
  group?: string;
  status?: string;
  since?: string;
  /** The MDX file the page is written in. */
  file: string;
  /** The MDX body, without frontmatter. */
  body: string;
}

export interface RenderContext {
  generator: Generator;
  pages: DocPage[];
}

const SEPARATOR = /^---.*---$/;

interface Meta {
  title?: string;
  pages?: string[];
}

function readMeta(dir: string): Meta {
  const file = path.join(dir, "meta.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Meta) : {};
}

/** The names in a folder in sidebar order: meta.json order first, then anything it does not list. */
function orderedEntries(dir: string, meta: Meta): string[] {
  const onDisk = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isFile() && e.name.endsWith(".mdx")) || e.isDirectory())
    .map((e) => e.name.replace(/\.mdx$/, ""));
  const listed = (meta.pages ?? []).filter((p) => !SEPARATOR.test(p) && p !== "...");
  const rest = onDisk.filter((name) => !listed.includes(name)).sort();
  return [...listed.filter((name) => onDisk.includes(name)), ...rest];
}

function frontmatter(file: string, text: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) throw new Error(`${file}: no frontmatter`);
  const data = parseYaml(match[1] as string) as Record<string, unknown>;
  if (typeof data.title !== "string") throw new Error(`${file}: no title in the frontmatter`);
  return { data, body: text.slice(match[0].length) };
}

/** Every docs page in sidebar order, read from the MDX files and their meta.json. */
export function readPages(contentDir: string): DocPage[] {
  const pages: DocPage[] = [];

  const visit = (dir: string, slugs: string[], section: string) => {
    const meta = readMeta(dir);
    for (const name of orderedEntries(dir, meta)) {
      const full = path.join(dir, name);
      if (fs.existsSync(`${full}.mdx`)) {
        const file = `${full}.mdx`;
        const { data, body } = frontmatter(file, fs.readFileSync(file, "utf8"));
        const pageSlugs = name === "index" ? slugs : [...slugs, name];
        const url = ["/docs", ...pageSlugs].join("/");
        pages.push({
          slugs: pageSlugs,
          url,
          markdownPath: markdownUrl(url).slice(1),
          title: data.title as string,
          description: typeof data.description === "string" ? data.description : "",
          section,
          group: typeof data.group === "string" ? data.group : undefined,
          status: typeof data.status === "string" ? data.status : undefined,
          since: typeof data.since === "string" ? data.since : undefined,
          file,
          body,
        });
      } else if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
        const sub = readMeta(full);
        visit(full, [...slugs, name], slugs.length === 0 ? (sub.title ?? name) : section);
      }
    }
  };

  visit(contentDir, [], "Overview");
  return pages;
}

// ---------------------------------------------------------------------------------------------
// MDX to Markdown
// ---------------------------------------------------------------------------------------------

type Jsx = MdxJsxFlowElement | MdxJsxTextElement;

const text = (value: string) => ({ type: "text" as const, value });
const paragraph = (...children: PhrasingContent[]): Paragraph => ({ type: "paragraph", children });
const cellOf = (...children: PhrasingContent[]): TableCell =>
  ({ type: "tableCell", children }) as TableCell;
const rowOf = (...cells: TableCell[]): TableRow => ({ type: "tableRow", children: cells });
const tableOf = (header: string[], rows: PhrasingContent[][][]): Table => ({
  type: "table",
  align: header.map(() => null),
  children: [
    rowOf(...header.map((h) => cellOf(text(h)))),
    ...rows.map((cells) => rowOf(...cells.map((children) => cellOf(...children)))),
  ],
});
const code = (value: string): PhrasingContent => ({ type: "inlineCode", value });

function attribute(node: Jsx, name: string): string | undefined {
  const found = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!found || found.value == null) return undefined;
  if (typeof found.value === "string") return found.value;
  // An expression such as {`...`}: read it as a literal, never run it.
  const parsed = parseLiteral(found.value.value);
  if (typeof parsed !== "string") throw new Error(`the ${name} attribute must be a string`);
  return parsed;
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** The generator's short names for types it summarises. They say nothing, so the full type is shown. */
const GENERIC_TYPES = new Set(["union", "object", "function", "array", "intersection", "tuple"]);

/** A prop's description is Markdown (backticks, links), so it is parsed, not written as plain text. */
function inlineMarkdown(source: string): PhrasingContent[] {
  const tree = remark().parse(oneLine(source)) as Root;
  const first = tree.children[0];
  return tree.children.length === 1 && first?.type === "paragraph"
    ? first.children
    : [text(oneLine(source))];
}

function entryRow(entry: DocEntry): PhrasingContent[][] {
  const defaultTag = entry.tags.find((tag) => tag.name === "default");
  const shortType = entry.simplifiedType || entry.type;
  return [
    [code(entry.name)],
    [code(oneLine(GENERIC_TYPES.has(shortType) ? entry.type : shortType))],
    [defaultTag ? code(oneLine(defaultTag.text)) : text("")],
    [text(entry.required ? "Yes" : "No")],
    inlineMarkdown(entry.description),
  ];
}

async function propsTables(node: Jsx, ctx: RenderContext, where: string): Promise<Content[]> {
  const docPath = attribute(node, "path");
  if (!docPath) throw new Error(`${where}: an AutoTypeTable has no path`);
  const docs = await ctx.generator.generateTypeTable(
    { path: docPath, name: attribute(node, "name"), type: attribute(node, "type") },
    {
      basePath: SITE_DIR,
      // A union of literals that has a name (ButtonVariant) is shown by name; list the members
      // instead, which is what a reader needs to write a valid value.
      transform(entry, propertyType) {
        if (!propertyType.isUnion()) return;
        const members = propertyType.getUnionTypes();
        const literals = members.filter((t) => t.isStringLiteral() || t.isNumberLiteral());
        if (literals.length >= 2) {
          const names = members.map((t) => t.getText());
          entry.type = [
            ...names.filter((n) => n !== "undefined"),
            ...names.filter((n) => n === "undefined"),
          ].join(" | ");
        }
      },
    },
  );
  const out: Content[] = [];
  for (const doc of docs) {
    if (docs.length > 1) out.push(paragraph({ type: "strong", children: [text(doc.name)] }));
    out.push(
      tableOf(["Prop", "Type", "Default", "Required", "Description"], doc.entries.map(entryRow)),
    );
  }
  return out;
}

function keyboardTable(node: Jsx, where: string): Content[] {
  const raw = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === "rows",
  )?.value;
  if (!raw || typeof raw === "string") throw new Error(`${where}: a KeyboardMap has no rows`);
  const rows = parseLiteral(raw.value) as { keys: string[]; action: string }[];
  return [
    tableOf(
      ["Key", "Action"],
      rows.map((row) => [
        row.keys.flatMap((key, i): PhrasingContent[] =>
          i === 0 ? [code(key)] : [text(" or "), code(key)],
        ),
        [text(row.action)],
      ]),
    ),
  ];
}

function componentList(ctx: RenderContext): Content[] {
  const items = ctx.pages.filter((p) => p.group && p.slugs[0] === "components");
  const out: Content[] = [];
  for (const group of COMPONENT_GROUPS) {
    const inGroup = items.filter((p) => p.group === group);
    if (inGroup.length === 0) continue;
    out.push({
      type: "heading",
      depth: 3,
      children: [text(group)],
    });
    out.push({
      type: "list",
      ordered: false,
      spread: false,
      children: inGroup.map((p) => ({
        type: "listItem" as const,
        spread: false,
        children: [
          paragraph(
            {
              type: "link",
              url: `${SITE_URL}/${p.markdownPath}`,
              children: [text(p.title)],
            },
            text(`: ${p.description}${p.status && p.status !== "stable" ? ` (${p.status})` : ""}`),
          ),
        ],
      })),
    });
  }
  return out;
}

function packageList(): Content[] {
  const packages = readPackages(PACKAGES_DIR);
  return [
    {
      type: "list",
      ordered: false,
      spread: false,
      children: packages.map((pkg) => ({
        type: "listItem" as const,
        spread: false,
        children: [
          paragraph(
            {
              type: "link",
              url: `${SITE_URL}${markdownUrl(pkg.docsUrl)}`,
              children: [code(pkg.name)],
            },
            text(`: ${pkg.description}`),
          ),
        ],
      })),
    },
  ];
}

async function demoCode(node: Jsx, where: string): Promise<Content[]> {
  const name = attribute(node, "name");
  if (!name || !isDemoName(name)) throw new Error(`${where}: unknown demo ${String(name)}`);
  const source = fs.readFileSync(demoSourcePath(DEMOS_DIR, name), "utf8").trim();
  return [{ type: "code", lang: "tsx", value: source } as Code];
}

/** A fixture file, with the name a reader should give it, as a code block. */
async function fixtureCode(node: Jsx, where: string): Promise<Content[]> {
  const file = attribute(node, "file");
  if (!file || !isFixtureFile(file))
    throw new Error(`${where}: unknown fixture file ${String(file)}`);
  const source = fs.readFileSync(fixtureFilePath(fixturesRoot(SITE_DIR), file), "utf8").trim();
  const title = attribute(node, "title") ?? file.split("/").slice(1).join("/");
  return [paragraph(code(title)), { type: "code", lang: languageOf(file), value: source } as Code];
}

function calloutBlock(node: Jsx, children: Content[]): Content[] {
  const title = attribute(node, "title");
  const label =
    title ??
    ({ info: "Note", warning: "Warning", error: "Warning" } as Record<string, string>)[
      attribute(node, "type") ?? "info"
    ] ??
    "Note";
  return [
    {
      type: "blockquote",
      children: [
        paragraph({ type: "strong", children: [text(label)] }),
        ...(children as BlockContent[]),
      ],
    },
  ];
}

/** Components that render nothing a reader of plain text would miss (a colour swatch). */
const DECORATIVE = new Set(["TokenSwatch", "ElevationSample"]);

async function replace(node: Content, ctx: RenderContext, where: string): Promise<Content[]> {
  switch (node.type) {
    case "mdxjsEsm":
      return [];
    case "mdxFlowExpression":
    case "mdxTextExpression": {
      if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(node.value)) return [];
      throw new Error(
        `${where}: an expression ({${node.value.slice(0, 30)}…}) cannot be written as Markdown`,
      );
    }
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement": {
      const name = node.name ?? "";
      if (DECORATIVE.has(name)) return [];
      if (name === "Demo") return demoCode(node, where);
      if (name === "FixtureFile") return fixtureCode(node, where);
      if (name === "AutoTypeTable") return propsTables(node, ctx, where);
      if (name === "KeyboardMap") return keyboardTable(node, where);
      if (name === "ComponentIndex") return componentList(ctx);
      if (name === "PackageIndex") return packageList();
      if (name === "Callout") {
        const children = await walkChildren(node.children as Content[], ctx, where);
        return calloutBlock(node, children);
      }
      throw new Error(
        `${where}: <${name}> has no Markdown form. Add one in scripts/build-llms.mts, or take it out of the page.`,
      );
    }
    default:
      return [await walkNode(node, ctx, where)];
  }
}

async function walkChildren(children: Content[], ctx: RenderContext, where: string) {
  const out: Content[] = [];
  for (const child of children) out.push(...(await replace(child, ctx, where)));
  return out;
}

async function walkNode(node: Content, ctx: RenderContext, where: string): Promise<Content> {
  if (node.type === "code") {
    // The meta string (example=..., result=...) is for the docs tests, not for readers.
    return { ...node, meta: null };
  }
  if ("children" in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: await walkChildren(node.children as Content[], ctx, where),
    } as Content;
  }
  return node;
}

/** Makes a root-relative link absolute, pointing docs pages at their Markdown version. */
function absolutise(url: string, pages: DocPage[]): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const hashAt = url.indexOf("#");
  const pathname = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  const page = pages.find((p) => p.url === pathname);
  return page ? `${SITE_URL}/${page.markdownPath}${hash}` : `${SITE_URL}${url}`;
}

function fixLinks(node: Content | Root, pages: DocPage[]): void {
  if ((node.type === "link" || node.type === "definition") && "url" in node) {
    node.url = absolutise(node.url, pages);
  }
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children as Content[]) fixLinks(child, pages);
  }
}

/** Turns an MDX page body into Markdown that needs no components to read. */
export async function toMarkdown(body: string, ctx: RenderContext, where: string): Promise<string> {
  const tree = remark().use(remarkMdx).use(remarkGfm).parse(body) as Root;
  const root: Root = {
    ...tree,
    children: (await walkChildren(tree.children as Content[], ctx, where)) as Root["children"],
  };
  fixLinks(root, ctx.pages);
  return remark()
    .use(remarkGfm)
    .data("settings", { bullet: "-", emphasis: "_", fences: true, rule: "-" })
    .stringify(root)
    .trim();
}

export async function renderPage(page: DocPage, ctx: RenderContext): Promise<string> {
  const body = await toMarkdown(page.body, ctx, page.url);
  const facts = [
    page.group ? `Group: ${page.group}` : "",
    page.status ? `Status: ${page.status}` : "",
    page.since ? `Added in @azmr/ui ${page.since}` : "",
  ].filter(Boolean);
  return [
    `# ${page.title}`,
    page.description ? `> ${page.description}` : "",
    `Source: ${SITE_URL}${page.url}`,
    facts.length > 0 ? facts.join(" · ") : "",
    body,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}

// ---------------------------------------------------------------------------------------------
// llms.txt and llms-full.txt
// ---------------------------------------------------------------------------------------------

const SUMMARY =
  "TypeScript libraries for building web apps: a signals-based reactivity core and query layer, a database adapter contract with SQLite and Supabase adapters, security helpers, and `@azmr/ui`, a React component library built on Base UI and Tailwind v4 design tokens.";

export function renderLlmsTxt(pages: DocPage[]): string {
  const sections = [...new Set(pages.map((p) => p.section))];
  const lines: string[] = [
    "# Azmara Platform",
    "",
    `> ${SUMMARY}`,
    "",
    `This file lists the documentation as Markdown pages that are easy for a coding assistant to read. Every page of ${SITE_URL}/docs is also available as Markdown by adding \`.md\` to its address. [llms-full.txt](${SITE_URL}/llms-full.txt) has all of it in one file, including the props tables and the source of every example.`,
    "",
    "The components are React-only today. The core, query, security and database packages have no React dependency.",
  ];
  const optional = new Set(["Changelog"]);
  for (const section of sections.filter((s) => !optional.has(s))) {
    lines.push("", `## ${section}`, "");
    for (const page of pages.filter((p) => p.section === section)) {
      lines.push(
        `- [${page.title}](${SITE_URL}/${page.markdownPath})${page.description ? `: ${page.description}` : ""}`,
      );
    }
  }
  for (const section of sections.filter((s) => optional.has(s))) {
    lines.push("", "## Optional", "");
    for (const page of pages.filter((p) => p.section === section)) {
      lines.push(
        `- [${page.title} changelog](${SITE_URL}/${page.markdownPath})${page.description ? `: ${page.description}` : ""}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export function renderLlmsFull(rendered: { page: DocPage; markdown: string }[]): string {
  const withoutChangelog = rendered.filter(({ page }) => page.section !== "Changelog");
  return `${withoutChangelog.map(({ markdown }) => markdown.trimEnd()).join("\n\n---\n\n")}\n`;
}

export async function generate(): Promise<void> {
  const pages = readPages(CONTENT_DIR);
  const ctx: RenderContext = {
    // No cache: the generator's cache key ignores the transform above, so a cached table (made by
    // the docs site's own generator, without it) would be returned instead.
    generator: createGenerator({ tsconfigPath: path.join(SITE_DIR, "tsconfig.json") }),
    pages,
  };
  const rendered: { page: DocPage; markdown: string }[] = [];
  for (const page of pages) rendered.push({ page, markdown: await renderPage(page, ctx) });

  fs.rmSync(path.join(PUBLIC_DIR, "docs"), { recursive: true, force: true });
  for (const { page, markdown } of rendered) {
    const target = path.join(PUBLIC_DIR, page.markdownPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, markdown);
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), renderLlmsTxt(pages));
  fs.writeFileSync(path.join(PUBLIC_DIR, "llms-full.txt"), renderLlmsFull(rendered));
  console.log(
    `[build-llms] wrote llms.txt, llms-full.txt and ${rendered.length} Markdown pages under public/docs`,
  );
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  generate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

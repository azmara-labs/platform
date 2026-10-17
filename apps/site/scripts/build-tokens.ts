import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Color, parse as parseColour, wcagContrast } from "culori";
import postcss, { type AtRule, type Comment, type Declaration, type Rule } from "postcss";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const TOKENS_CSS = path.join(REPO_ROOT, "packages", "ui", "src", "styles", "tokens.css");
const OUTPUT = path.resolve(__dirname, "../content/docs/guide/tokens.mdx");

export interface Token {
  /** The custom property, e.g. "--primary". */
  name: string;
  /** The declared value, whitespace collapsed. */
  value: string;
  /** For `light-dark(a, b)` colours, the two halves. */
  light?: string;
  dark?: string;
  /** A comment written directly above the token in tokens.css. */
  note?: string;
  /** Tailwind utilities that read this token, from the `@theme inline` mapping. */
  utilities: string[];
  /** The value it takes under `prefers-reduced-motion: reduce`, if that differs. */
  reduced?: string;
}

export interface Group {
  title: string;
  /** The rest of the section comment after the title. */
  note?: string;
  tokens: Token[];
}

export interface ParsedTokens {
  groups: Group[];
  /** Density overrides keyed by `compact` and `spacious` (comfortable is the :root default). */
  density: Record<"compact" | "spacious", Map<string, string>>;
}

/** Collapses the whitespace in a comment or a multi-line value. */
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** Splits a function's argument list on its top-level commas. */
export function splitArgs(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts;
}

/** "Status (destructive is ...)" -> title "Status"; "Lines and focus. --ring ..." -> "Lines and focus". */
function splitHeading(text: string): { title: string; note?: string } {
  const cut = /\.\s|\s\(/.exec(text);
  if (!cut) return { title: text.replace(/\.$/, "") };
  const title = text.slice(0, cut.index).trim();
  let note = text.slice(cut.index).trim();
  // "Status (a; b)" keeps what is inside the parentheses; "Typography. More." keeps what follows.
  note = note.startsWith("(")
    ? note.replace(/^\(/, "").replace(/\)\.?$/, "")
    : note.replace(/^\.\s*/, "");
  note = note.trim();
  return note ? { title, note } : { title };
}

/** The Tailwind utilities each token reaches, read from the `@theme inline` block. */
function utilitiesByToken(root: postcss.Root): Map<string, string[]> {
  const prefixes: [string, string][] = [
    ["--radius-", "rounded-"],
    ["--shadow-", "shadow-"],
    ["--ease-", "ease-"],
    ["--font-", "font-"],
  ];
  const out = new Map<string, string[]>();
  root.walkAtRules("theme", (theme: AtRule) => {
    theme.walkDecls((decl: Declaration) => {
      const source = /var\((--[\w-]+)\)/.exec(decl.value)?.[1];
      if (!source) return;
      let utility: string | undefined;
      if (decl.prop.startsWith("--color-")) {
        utility = colourUtility(decl.prop.slice("--color-".length));
      } else {
        const prefix = prefixes.find(([p]) => decl.prop.startsWith(p));
        if (prefix) utility = `${prefix[1]}${decl.prop.slice(prefix[0].length)}`;
      }
      if (utility) out.set(source, [...(out.get(source) ?? []), utility]);
    });
  });
  return out;
}

/**
 * The utility a colour token is usually reached by. Every colour token works with every colour
 * utility (bg-, text-, border-, ring-, fill-, ...); this is the one that matches its role.
 */
export function colourUtility(key: string): string {
  if (/foreground$|-text$/.test(key)) return `text-${key}`;
  if (key === "border" || key === "input" || key === "sidebar-border") return `border-${key}`;
  if (key === "ring" || key === "sidebar-ring") return `ring-${key}`;
  return `bg-${key}`;
}

/** Token values inside `@media (prefers-reduced-motion: reduce) { :root { ... } }`. */
function reducedMotionValues(root: postcss.Root): Map<string, string> {
  const out = new Map<string, string>();
  root.walkAtRules("media", (at: AtRule) => {
    if (!/prefers-reduced-motion:\s*reduce/.test(at.params)) return;
    at.walkRules(":root", (rule: Rule) => {
      rule.walkDecls((decl: Declaration) => {
        if (decl.prop.startsWith("--")) out.set(decl.prop, squash(decl.value));
      });
    });
  });
  return out;
}

export function parseTokens(css: string): ParsedTokens {
  const root = postcss.parse(css);
  const utilities = utilitiesByToken(root);
  const reduced = reducedMotionValues(root);

  const rootRules = root.nodes.filter(
    (node): node is Rule => node.type === "rule" && node.selector === ":root",
  );
  if (rootRules.length === 0) throw new Error("tokens.css has no top-level :root rule");

  const groups: Group[] = [];
  let current: Group | undefined;
  let pendingNote: string | undefined;

  // Every top-level :root rule counts, in order, so a token added in a second block is not lost.
  for (const node of rootRules.flatMap((rule) => rule.nodes)) {
    if (node.type === "comment") {
      const text = squash((node as Comment).text);
      // A comment after a blank line opens a section; one directly above a token describes it.
      if (node.raws.before?.includes("\n\n")) {
        const { title, note } = splitHeading(text);
        current = { title, ...(note ? { note } : {}), tokens: [] };
        groups.push(current);
        pendingNote = undefined;
      } else {
        pendingNote = text;
      }
      continue;
    }
    if (node.type !== "decl" || !node.prop.startsWith("--")) continue;
    if (!current) {
      current = { title: "Shape", tokens: [] };
      groups.push(current);
    }
    const value = squash(node.value);
    const lightDark = /^light-dark\((.*)\)$/s.exec(value);
    const halves = lightDark?.[1] ? splitArgs(lightDark[1]) : undefined;
    const reducedValue = reduced.get(node.prop);
    current.tokens.push({
      name: node.prop,
      value,
      ...(halves ? { light: halves[0], dark: halves[1] } : {}),
      ...(pendingNote ? { note: pendingNote } : {}),
      utilities: utilities.get(node.prop) ?? [],
      ...(reducedValue && reducedValue !== value ? { reduced: reducedValue } : {}),
    });
    pendingNote = undefined;
  }

  const density = { compact: new Map<string, string>(), spacious: new Map<string, string>() };
  root.walkRules((rule: Rule) => {
    const level = /^\[data-density="(compact|spacious)"\]$/.exec(rule.selector)?.[1] as
      | "compact"
      | "spacious"
      | undefined;
    if (!level) return;
    rule.walkDecls((decl: Declaration) => {
      density[level].set(decl.prop, squash(decl.value));
    });
  });

  return { groups, density };
}

type Mode = "light" | "dark";

/** Resolves a colour token for a mode, or undefined if it is not a colour. */
function colourOf(tokens: Map<string, Token>, name: string, mode: Mode): Color | undefined {
  const token = tokens.get(name);
  if (!token) return undefined;
  const raw =
    token.light !== undefined ? (mode === "light" ? token.light : token.dark) : token.value;
  return raw ? parseColour(raw) : undefined;
}

export interface ContrastRow {
  foreground: string;
  background: string;
  light: number;
  dark: number;
}

function ratios(tokens: Map<string, Token>, pairs: [string, string][]): ContrastRow[] {
  const rows: ContrastRow[] = [];
  for (const [foreground, background] of pairs) {
    const lf = colourOf(tokens, foreground, "light");
    const lb = colourOf(tokens, background, "light");
    const df = colourOf(tokens, foreground, "dark");
    const db = colourOf(tokens, background, "dark");
    if (!lf || !lb || !df || !db) continue;
    rows.push({
      foreground,
      background,
      light: wcagContrast(lf, lb),
      dark: wcagContrast(df, db),
    });
  }
  return rows;
}

export interface ContrastTables {
  /** Text on its own surface: every `--x-foreground` on `--x`, plus muted text on the page. */
  text: ContrastRow[];
  /** Status colours used as text on the page and on cards. */
  tones: ContrastRow[];
  /** The focus ring against the surfaces it appears on. */
  ring: ContrastRow[];
  /** Chart series against the page and cards. */
  charts: ContrastRow[];
}

export function contrastTables(parsed: ParsedTokens): ContrastTables {
  const tokens = new Map(parsed.groups.flatMap((g) => g.tokens).map((t) => [t.name, t]));
  const text: [string, string][] = [["--foreground", "--background"]];
  for (const name of tokens.keys()) {
    if (name.endsWith("-foreground") && tokens.has(name.replace(/-foreground$/, ""))) {
      text.push([name, name.replace(/-foreground$/, "")]);
    }
  }
  text.push(["--muted-foreground", "--background"]);
  const tones: [string, string][] = [];
  for (const tone of ["--destructive", "--success", "--warning-text", "--info"]) {
    for (const surface of ["--background", "--card"]) tones.push([tone, surface]);
  }
  const ring: [string, string][] = ["--background", "--card", "--popover"].map((s) => [
    "--ring",
    s,
  ]);
  const charts: [string, string][] = [];
  for (let i = 1; i <= 8; i++)
    for (const s of ["--background", "--card"]) charts.push([`--chart-${i}`, s]);
  return {
    text: ratios(tokens, text),
    tones: ratios(tokens, tones),
    ring: ratios(tokens, ring),
    charts: ratios(tokens, charts),
  };
}

/** Escapes text for MDX prose: braces and angle brackets would start expressions or tags. */
export function mdxText(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const code = (text: string) => `\`${text.replaceAll("`", "")}\``;

/**
 * Prose from a CSS comment, ready for MDX: token names and `createTheme(...)` calls become code,
 * the rest is escaped, the first letter is capitalised and it ends with one full stop.
 */
export function proseText(text: string): string {
  const parts = text.split(/(createTheme\([^)]*\)|--[\w-]+)/g);
  const rendered = parts
    .map((part, index) => (index % 2 === 1 ? code(part) : mdxText(part)))
    .join("")
    .trim();
  const capitalised = rendered.replace(/^[a-z]/, (letter) => letter.toUpperCase());
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}
const attr = (text: string) => text.replaceAll('"', "&quot;");
const isColour = (token: Token) => token.light !== undefined;

function tableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function table(headings: string[], rows: string[][]): string {
  return [tableRow(headings), tableRow(headings.map(() => "---")), ...rows.map(tableRow)].join(
    "\n",
  );
}

function colourSection(group: Group): string {
  const rows = group.tokens.map((token) => [
    `<TokenSwatch light="${attr(token.light ?? "")}" dark="${attr(token.dark ?? "")}" />`,
    code(token.name),
    code(token.light ?? ""),
    code(token.dark ?? ""),
    token.utilities.map(code).join(", "),
  ]);
  return table(["", "Token", "Light", "Dark", "Tailwind"], rows);
}

function valueSection(group: Group): string {
  const hasReduced = group.tokens.some((t) => t.reduced !== undefined);
  const hasShadow = group.title === "Elevation";
  const headings = [
    ...(hasShadow ? [""] : []),
    "Token",
    "Value",
    "Tailwind",
    ...(hasReduced ? ["Reduced motion"] : []),
    "Notes",
  ];
  const rows = group.tokens.map((token) => [
    ...(hasShadow ? [`<ElevationSample shadow="${attr(token.value)}" />`] : []),
    code(token.name),
    code(token.value),
    token.utilities.map(code).join(", "),
    ...(hasReduced ? [token.reduced ? code(token.reduced) : ""] : []),
    token.note ? proseText(token.note) : "",
  ]);
  return table(headings, rows);
}

function ratio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

function contrastSection(rows: ContrastRow[], minimum: number): string {
  const verdict = (value: number) => (value >= minimum ? "pass" : `below ${minimum}:1`);
  return table(
    ["Foreground", "On", "Light", "Dark"],
    rows.map((row) => [
      code(row.foreground),
      code(row.background),
      `${ratio(row.light)} (${verdict(row.light)})`,
      `${ratio(row.dark)} (${verdict(row.dark)})`,
    ]),
  );
}

function densitySection(parsed: ParsedTokens, comfortable: Group): string {
  const names = [...parsed.density.compact.keys()];
  const rows = names.map((name) => [
    code(name),
    code(parsed.density.compact.get(name) ?? ""),
    code(comfortable.tokens.find((t) => t.name === name)?.value ?? ""),
    code(parsed.density.spacious.get(name) ?? ""),
  ]);
  return table(["Token", "Compact", "Comfortable (default)", "Spacious"], rows);
}

export function renderTokensMdx(css: string): string {
  const parsed = parseTokens(css);
  const contrast = contrastTables(parsed);
  const sections: string[] = [];

  for (const group of parsed.groups) {
    const heading = `## ${mdxText(group.title)}`;
    const note = group.note ? `\n\n${proseText(group.note)}` : "";
    const body =
      group.tokens.length > 0 && group.tokens.every(isColour)
        ? colourSection(group)
        : valueSection(group);
    sections.push(`${heading}${note}\n\n${body}`);
    if (group.title === "Density") {
      sections.push(
        `### Density levels\n\nSet \`data-density="compact"\` or \`data-density="spacious"\` on any element to change the density of everything inside it.\n\n${densitySection(parsed, group)}`,
      );
    }
  }

  return `---
title: Design tokens
description: Every design token in @azmr/ui, with its light and dark values, the Tailwind utilities that use it, and the contrast it is tested against.
---

{/* Generated by scripts/build-tokens.ts from packages/ui/src/styles/tokens.css. Do not edit. */}

Every colour, radius, motion, elevation, layering and density value in \`@azmr/ui\` is a CSS custom property declared in \`@azmr/ui/tokens.css\`. This page is generated from that file when the docs are built, so it cannot drift from it.

In the colour tables the swatch shows the light value on the left and the dark value on the right. Colours are OKLCH. The names follow shadcn/ui, so components from any shadcn registry fit alongside ours.

To change a token, override it in your own CSS after the import, for any scope:

\`\`\`css
:root {
  --primary: oklch(0.55 0.2 260);
}

.dark {
  --primary: oklch(0.75 0.15 260);
}
\`\`\`

${sections.join("\n\n")}

## Contrast the tests guarantee

The values below are computed from the tokens above with the WCAG 2.x contrast formula. The package's own tests fail if any of them drops below its threshold, so a token change cannot make a component unreadable without a test failing.

### Text on its surface (4.5:1)

${contrastSection(contrast.text, 4.5)}

### Status colours as text on the page and on cards (4.5:1)

\`--warning\` is a yellow surface colour, so text in the warning tone uses \`--warning-text\`.

${contrastSection(contrast.tones, 4.5)}

### Focus ring (3:1)

${contrastSection(contrast.ring, 3)}

### Chart series on the page and on cards (3:1)

The eight chart colours are also tested to stay distinguishable from each other under normal vision, protanopia, deuteranopia and tritanopia.

${contrastSection(contrast.charts, 3)}
`;
}

export function generate(): void {
  const css = fs.readFileSync(TOKENS_CSS, "utf8");
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, renderTokensMdx(css));
  console.log("[build-tokens] generated content/docs/guide/tokens.mdx");
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  generate();
}

import { posix } from "node:path";

/** Source files keyed by path relative to `src/`, with forward slashes. */
export type SourceFiles = Record<string, string>;

export type Rule =
  | "no-raw-colour"
  | "no-dangerous-html"
  | "layer-boundary"
  | "server-safe-no-react"
  | "server-component-stateless"
  | "base-ui-only-in-primitives";

export interface Violation {
  rule: Rule;
  file: string;
  line: number;
  message: string;
}

export interface Options {
  /**
   * Files that predate the conventions and are scheduled for replacement. They are exempt
   * from `no-raw-colour` only. Every entry needs a removal condition at its call site.
   */
  legacy?: string[];
  /**
   * Folders (relative to src, with a trailing slash) whose entries ship as Server Components:
   * stateless React only, no hooks or context, no "use client". Taken from build/entries.json.
   */
  serverComponentDirs?: string[];
}

/** Lowest to highest. A layer may import itself and anything below it. */
export const LAYERS = ["styles", "primitives", "components", "blocks", "dynamic"] as const;
/** Shared modules every layer may use; they may not import any layer. */
export const FOUNDATION = ["lib", "hooks", "icons", "motion", "theme", "react"] as const;
/** Folders that ship in server-safe entries: they must not import React. */
export const SERVER_SAFE = ["lib", "theme"] as const;

const RAW_COLOUR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
const IMPORT_SPECIFIER =
  /(?:import|export)\s[^'"`;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
const IGNORE_MARKER = "conventions-ignore";
// Everything that needs a client runtime: all hooks, context and class components.
const STATEFUL_REACT = /^(?:use[A-Z]\w*|createContext|Component|PureComponent)$/;
const REACT_NAMED_IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']react["']/g;
const REACT_NAMESPACE_IMPORT = /import\s*\*\s*as\s+(\w+)\s+from\s*["']react["']/;
const USE_CLIENT = /^\s*["']use client["']/;

const isTestCode = (file: string) =>
  /\.test\.(ts|tsx)$/.test(file) || file.startsWith("test-utils/") || file === "test-setup.ts";

const topSegment = (path: string) => (path.split("/")[0] ?? "").replace(/\.(?:ts|tsx|js|mjs)$/, "");

/** Replace comments with spaces, keeping every newline so line numbers stay correct. */
function blankComments(code: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(
      /(^|\s)\/\/.*$/gm,
      (match, lead: string) => lead + " ".repeat(match.length - lead.length),
    );
}

const lineOf = (code: string, index: number) => code.slice(0, index).split("\n").length;

export function checkConventions(files: SourceFiles, options: Options = {}): Violation[] {
  const legacy = new Set(options.legacy ?? []);
  const serverComponentDirs = options.serverComponentDirs ?? [];
  const violations: Violation[] = [];
  const report = (rule: Rule, file: string, line: number, message: string) =>
    violations.push({ rule, file, line, message });

  for (const [file, original] of Object.entries(files)) {
    if (isTestCode(file)) continue;
    const code = blankComments(original);
    const originalLines = original.split("\n");
    const codeLines = code.split("\n");

    codeLines.forEach((text, i) => {
      const line = i + 1;
      // The marker exempts a literal colour only. Banned APIs (dangerouslySetInnerHTML) and
      // import rules have no escape hatch.
      const colourExempt = (originalLines[i] ?? "").includes(IGNORE_MARKER);
      if (!colourExempt && !legacy.has(file) && RAW_COLOUR.test(text)) {
        report(
          "no-raw-colour",
          file,
          line,
          "use a design token (bg-background, var(--foreground), ...), not a literal colour",
        );
      }
      if (text.includes("dangerouslySetInnerHTML")) {
        report(
          "no-dangerous-html",
          file,
          line,
          "dangerouslySetInnerHTML is banned; render text or sanitised content through a component",
        );
      }
    });

    if (serverComponentDirs.some((dir) => file.startsWith(dir))) {
      if (USE_CLIENT.test(code)) {
        report(
          "server-component-stateless",
          file,
          1,
          'a Server Component entry must not carry "use client"',
        );
      }
      for (const match of code.matchAll(REACT_NAMED_IMPORT)) {
        for (const part of (match[1] ?? "").split(",")) {
          const name =
            part
              .trim()
              .replace(/^type\s+/, "")
              .split(/\s+as\s+/)[0] ?? "";
          if (STATEFUL_REACT.test(name)) {
            report(
              "server-component-stateless",
              file,
              lineOf(code, match.index ?? 0),
              `"${name}" needs a client runtime; this folder ships as a Server Component`,
            );
          }
        }
      }
      const namespace = code.match(REACT_NAMESPACE_IMPORT)?.[1];
      if (namespace) {
        const used = new RegExp(
          `\\b${namespace}\\.(use[A-Z]\\w*|createContext|Component|PureComponent)\\b`,
          "g",
        );
        for (const match of code.matchAll(used)) {
          report(
            "server-component-stateless",
            file,
            lineOf(code, match.index ?? 0),
            `"${match[0]}" needs a client runtime; this folder ships as a Server Component`,
          );
        }
      }
    }

    const layer = topSegment(file);
    const layerIndex = (LAYERS as readonly string[]).indexOf(layer);
    const isFoundation = (FOUNDATION as readonly string[]).includes(layer);

    for (const match of code.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (!specifier) continue;
      const line = lineOf(code, match.index ?? 0);

      if (/^@base-ui\/react(?:\/|$)/.test(specifier) && layer !== "primitives") {
        report(
          "base-ui-only-in-primitives",
          file,
          line,
          `"${specifier}" may only be imported from src/primitives so the engine stays swappable`,
        );
      }

      if (
        /^react-dom(?:\/|$)/.test(specifier) &&
        serverComponentDirs.some((dir) => file.startsWith(dir))
      ) {
        report(
          "server-component-stateless",
          file,
          line,
          `"${specifier}" is not allowed in a Server Component folder`,
        );
      }

      const isServerSafe = (SERVER_SAFE as readonly string[]).includes(layer);
      if (isServerSafe && /^react(?:-dom)?(?:\/|$)/.test(specifier)) {
        report(
          "server-safe-no-react",
          file,
          line,
          `"${layer}" is a server-safe entry and must not import "${specifier}"`,
        );
      }

      if (!specifier.startsWith(".")) continue;
      const target = topSegment(posix.normalize(posix.join(posix.dirname(file), specifier)));
      if (isServerSafe && target === "react") {
        report(
          "server-safe-no-react",
          file,
          line,
          `"${layer}" is a server-safe entry and must not import the client "react" folder`,
        );
      }
      const targetIndex = (LAYERS as readonly string[]).indexOf(target);
      if (targetIndex === -1) continue;
      if (isFoundation) {
        report(
          "layer-boundary",
          file,
          line,
          `foundation module "${layer}" must not import the "${target}" layer`,
        );
      } else if (layerIndex !== -1 && targetIndex > layerIndex) {
        report(
          "layer-boundary",
          file,
          line,
          `"${layer}" must not import from the higher layer "${target}"`,
        );
      }
    }
  }
  return violations;
}

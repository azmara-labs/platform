// Pure rules that scripts/verify-dist.mjs applies to the built files. Kept free of file access so
// they can be unit-tested (dist-rules.test.mjs).
//
// Entry kinds (build/entries.json):
//   client            "use client" banner; may use anything.
//   serverComponents  no directive; stateless React only (forwardRef, createElement, the JSX
//                     runtime). Hooks and context would crash a Server Component at runtime.
//   server            no directive; no React at all (pure functions and data).

import { posix } from "node:path";

const stripLeadingComments = (code) =>
  code.replace(/^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*/, "").trimStart();

export const hasUseClientDirective = (code) =>
  /^["']use client["'];?/.test(stripLeadingComments(code));

/**
 * Relative specifiers a file imports (static, side-effect, re-export, dynamic), as written:
 * `./x.js` for siblings and `../x.js` for the shared chunks that nested entries (`icons/lucide`)
 * reach in the parent directory.
 */
export function relativeImports(code) {
  const found = [];
  for (const match of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
    found.push(match[1]);
  }
  return found;
}

/** Resolves an import specifier against the importing file; both are relative to `dist/`. */
export function resolveImport(fromFile, specifier) {
  return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
}

const REACT_SPECIFIER = /["']react(?:\/[^"']*)?["']/;
const importsReactAny = (code) =>
  new RegExp(
    `(?:from|import)\\s*\\(?\\s*${REACT_SPECIFIER.source}|require\\(\\s*${REACT_SPECIFIER.source}`,
  ).test(code);
export const importsReactDom = (code) =>
  /(?:from|import)\s*\(?\s*["']react-dom(?:\/[^"']*)?["']|require\(\s*["']react-dom/.test(code);

/** Server-safe entries that must not touch React at all. */
export function serverPureProblems(code) {
  return importsReactAny(code) || importsReactDom(code) ? ["imports React"] : [];
}

// Everything that needs a client runtime: all hooks, context, and class components.
const STATEFUL = /^(?:use[A-Z]\w*|createContext|Component|PureComponent)$/;

/** Named bindings imported from "react" (original names, not aliases). */
function reactNamedImports(code) {
  const names = [];
  for (const match of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']react["']/g)) {
    for (const part of (match[1] ?? "").split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) names.push(name);
    }
  }
  return names;
}

/** Server Component entries: stateless React is fine, anything stateful is not. */
export function serverComponentProblems(code) {
  const problems = [];
  if (importsReactDom(code)) problems.push("imports react-dom");
  for (const name of reactNamedImports(code)) {
    if (STATEFUL.test(name)) problems.push(`imports "${name}" from react`);
  }
  const namespace = code.match(/import\s*\*\s*as\s+(\w+)\s+from\s*["']react["']/)?.[1];
  if (namespace) {
    const used = new RegExp(
      `\\b${namespace}\\.((?:use[A-Z]\\w*)|createContext|Component|PureComponent)\\b`,
      "g",
    );
    for (const match of code.matchAll(used))
      problems.push(`uses ${namespace}.${match[1]} from react`);
  }
  return problems;
}

// Turns package source into registry source. The registry (shadcn-compatible) ships components as
// copy-and-own files, so relative imports into this package (`../../lib/cn.js`) must become the
// aliases a user's project has (`@/lib/utils`) or the package Base UI is imported from. The
// rewrite is by specifier only, so the shipped code is the same code the package builds from.
//
// Safety: a relative import with no mapping is an error, never silently left in. Shipping a file
// that imports `../../lib/cn.js` would not compile in someone else's app.

// `from "x"`, side-effect `import "x"`, and dynamic `import("x")`, with a relative specifier.
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"'\n]+)\2/g;

/**
 * Blank comments so an import-looking comment is not mistaken for code. Same length as the
 * input (newlines kept), so match offsets can be applied to the original text.
 */
function withoutComments(code) {
  const blank = (text) => text.replace(/[^\n]/g, " ");
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|\s)(\/\/.*)$/gm, (_all, lead, comment) => lead + blank(comment));
}

/** Relative specifiers a file imports, as written. */
export function relativeSpecifiers(code) {
  const found = [];
  for (const match of withoutComments(code).matchAll(SPECIFIER)) found.push(match[3]);
  return found;
}

/**
 * Rewrites every relative specifier through `map`. Throws for an unmapped one. With
 * `strictUnused`, also throws if a mapping was not used, so stale rules cannot accumulate.
 */
export function rewriteImports(code, map, file, { strictUnused = false } = {}) {
  const used = new Set();
  const comments = withoutComments(code);
  const out = [];
  let last = 0;
  for (const match of comments.matchAll(SPECIFIER)) {
    const [whole, lead, quote, specifier] = match;
    const target = Object.hasOwn(map, specifier) ? map[specifier] : undefined;
    if (target === undefined) {
      throw new Error(
        `${file}: relative import "${specifier}" has no registry mapping. Add one to registry/items.json or change the import.`,
      );
    }
    used.add(specifier);
    const start = match.index;
    out.push(code.slice(last, start), `${lead}${quote}${target}${quote}`);
    last = start + whole.length;
  }
  out.push(code.slice(last));
  if (strictUnused) {
    const unused = Object.keys(map).filter((key) => !used.has(key));
    if (unused.length > 0) {
      throw new Error(`${file}: unused mapping(s): ${unused.join(", ")}`);
    }
  }
  return out.join("");
}

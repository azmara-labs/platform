/**
 * What a demo shows before "Show full source". A component page used to render every demo's whole
 * file, highlighted token by token and then again in React's server payload; most readers look at
 * the JSX, not the imports and state around it. So a long demo shows the JSX its default export
 * returns, and the full file is fetched only when someone expands it (PAZM-143).
 */

/** Files this short are shown whole: a collapsed view would save almost nothing. */
export const SHOW_WHOLE_UP_TO_LINES = 15;

export interface DemoPreview {
  /** The code shown on the page. */
  code: string;
  /** True when `code` is an excerpt and the full file is available on demand. */
  collapsed: boolean;
  /** Lines in the full file. */
  totalLines: number;
}

/** Removes the indentation the lines share, so an excerpt starts at the left edge. */
export function dedent(lines: readonly string[]): string {
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => /^ */.exec(line)?.[0].length ?? 0);
  const shared = indents.length > 0 ? Math.min(...indents) : 0;
  return lines
    .map((line) => line.slice(shared))
    .join("\n")
    .trim();
}

/**
 * The JSX inside `return ( ... )` of the default export, or undefined when the file does not have
 * that shape. Parentheses inside strings and template literals are not special-cased; demo JSX does
 * not put unbalanced ones there, and a wrong match only falls back to the whole file.
 */
export function returnedJsx(source: string): string | undefined {
  const exportAt = source.indexOf("export default function");
  if (exportAt < 0) return undefined;
  // The component's own return is the least indented `return (` after the export: callbacks and
  // helpers inside it (a row renderer, an early return in a handler) return JSX first, but deeper.
  let returnAt = -1;
  let shallowest = Number.POSITIVE_INFINITY;
  for (
    let at = source.indexOf("return (", exportAt);
    at >= 0;
    at = source.indexOf("return (", at + 1)
  ) {
    const indent = at - (source.lastIndexOf("\n", at) + 1);
    if (indent <= shallowest) {
      shallowest = indent;
      returnAt = at;
    }
  }
  if (returnAt < 0) return undefined;
  const open = returnAt + "return ".length;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")" && --depth === 0) {
      return dedent(source.slice(open + 1, i).split("\n"));
    }
  }
  return undefined;
}

export function demoPreview(source: string): DemoPreview {
  const full = source.trim();
  const totalLines = full.split("\n").length;
  if (totalLines <= SHOW_WHOLE_UP_TO_LINES) return { code: full, collapsed: false, totalLines };
  const jsx = returnedJsx(full);
  // No recognisable JSX, or an excerpt that is most of the file: show it whole.
  if (!jsx || jsx.split("\n").length > totalLines * 0.8) {
    return { code: full, collapsed: false, totalLines };
  }
  return { code: jsx, collapsed: true, totalLines };
}

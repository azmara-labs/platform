/**
 * Executable examples in the docs. A fenced block like
 *
 *     ```ts example=merge result=merged
 *     import { cn } from "@azmr/ui/lib";
 *     const merged = cn("size-8", "size-10");
 *     // => "size-10"
 *     ```
 *
 * is run by a test: `result` names the variable to read after the code has run, and the JSON on
 * the `// =>` line is the value the docs promise it has. So the output shown on a page is the
 * output the package returns. Imports are dropped (the test supplies the names); the code must be
 * plain JavaScript apart from the import lines.
 */
export interface DocExample {
  name: string;
  result: string;
  code: string;
  /** Parsed from the `// =>` line, or undefined when the block has none. */
  expected: unknown;
}

export function extractExamples(markdown: string): DocExample[] {
  const out: DocExample[] = [];
  for (const match of markdown.matchAll(/^```ts example=(\S+) result=(\S+)\n([\s\S]*?)^```/gm)) {
    const body = match[3] as string;
    const expected = /^\/\/ => (.*)$/m.exec(body)?.[1];
    out.push({
      name: match[1] as string,
      result: match[2] as string,
      code: body.replace(/^import .*\n/gm, "").replace(/^\/\/ => .*$/m, ""),
      expected: expected === undefined ? undefined : JSON.parse(expected),
    });
  }
  return out;
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>;

/**
 * Runs an example with the given names in scope and resolves to the value of its `result`
 * variable. The code may use `await` at the top level.
 */
export async function runExample(
  example: DocExample,
  scope: Record<string, unknown>,
): Promise<unknown> {
  const names = Object.keys(scope);
  const fn = new AsyncFunction(
    ...names,
    `${example.code}
return ${example.result};`,
  );
  return fn(...names.map((name) => scope[name]));
}

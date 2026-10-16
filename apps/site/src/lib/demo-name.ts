import { join, resolve, sep } from "node:path";

/**
 * A demo is addressed as `group/name` (more segments allowed), each segment lower-case kebab-case.
 * The name comes from MDX and is turned into a file path, so the pattern is deliberately narrow:
 * no dots, slashes at the ends, backslashes, drive letters or encoded traversal can match.
 */
const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const DEMO_NAME = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+$`);

export function isDemoName(value: unknown): value is string {
  return typeof value === "string" && DEMO_NAME.test(value);
}

/** The source file of a demo, guaranteed to be inside `root`. */
export function demoSourcePath(root: string, name: string): string {
  if (!isDemoName(name)) throw new Error(`Invalid demo name: ${JSON.stringify(name)}`);
  const base = resolve(root);
  const file = resolve(`${join(base, ...name.split("/"))}.demo.tsx`);
  // Belt and braces: the pattern already forbids traversal, this proves the result.
  if (!file.startsWith(base + sep)) throw new Error(`Invalid demo name: ${JSON.stringify(name)}`);
  return file;
}

import { BREAKPOINTS, type Breakpoint } from "./responsive.js";

/** A value, or one per breakpoint: `4` or `{ base: 1, md: 3 }`. A bare value applies from `base`. */
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

type ClassTable = Readonly<Record<Breakpoint, Readonly<Record<string, string>>>>;

/**
 * The classes for a responsive value, looked up in a generated table. Unknown breakpoints and
 * values are ignored rather than turned into broken class names.
 */
export function responsiveClasses<K extends string | number>(
  value: Responsive<K> | undefined,
  table: ClassTable,
): string[] {
  if (value === undefined || value === null) return [];
  const perBreakpoint: Partial<Record<Breakpoint, K>> =
    typeof value === "object" ? (value as Partial<Record<Breakpoint, K>>) : { base: value };
  const classes: string[] = [];
  for (const breakpoint of BREAKPOINTS) {
    if (!Object.hasOwn(perBreakpoint, breakpoint)) continue;
    const key = perBreakpoint[breakpoint];
    if (key === undefined) continue;
    const row = table[breakpoint];
    const name = String(key);
    if (Object.hasOwn(row, name)) classes.push(row[name] as string);
  }
  return classes;
}

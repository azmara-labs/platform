import type { IconComponent } from "./types.js";

/** Icon names are kebab-case, like Lucide's own: `arrow-right`, `circle-alert`. */
export const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const registry = new Map<string, IconComponent>();
const warned = new Set<string>();

/** Anything React can render as a component: a function, or a forwardRef / memo object. */
export function isIconComponent(value: unknown): value is IconComponent {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "$$typeof" in value)
  );
}

export function assertIconEntry(name: string, component: unknown): void {
  if (!ICON_NAME.test(name)) {
    throw new TypeError(
      `Invalid icon name "${name}": use lower-case kebab-case, e.g. "arrow-right"`,
    );
  }
  if (!isIconComponent(component)) {
    throw new TypeError(`Icon "${name}" must be a React component that renders an <svg>`);
  }
}

/**
 * Registers custom icons for `<Icon name="..." />`. A later registration replaces an earlier one
 * with the same name. Validated up front and atomic: if any entry is invalid, none is registered.
 */
export function registerIcons(icons: Record<string, IconComponent>): void {
  const entries = Object.entries(icons);
  for (const [name, component] of entries) assertIconEntry(name, component);
  for (const [name, component] of entries) registry.set(name, component);
}

export function getIcon(name: string): IconComponent | undefined {
  return registry.get(name);
}

export function registeredIconNames(): string[] {
  return [...registry.keys()];
}

/** Warns once per name in development; never throws, so a typo cannot take a page down. */
export function warnMissingIcon(name: string | undefined): void {
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const key = name ?? "(no icon or name)";
  if (isProduction || warned.has(key)) return;
  warned.add(key);
  console.error(
    name === undefined
      ? "<Icon> needs an `icon` component or a registered `name`; rendering nothing."
      : `<Icon name="${name}"> is not registered (see registerIcons); rendering nothing.`,
  );
}

/** @internal Clears the registry and the warning memory. For tests. */
export function resetIcons(): void {
  registry.clear();
  warned.clear();
}

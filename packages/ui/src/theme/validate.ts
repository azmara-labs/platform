// Server-safe. Validation of the non-colour theme options (the output is CSS).

export const RADIUS = /^(?:\d+|\d*\.\d+)(?:rem|px)$/;
export const FONT = /^[A-Za-z0-9 ,'"._-]+$/;

export function assertRadius(radius: string): string {
  if (!RADIUS.test(radius))
    throw new Error(
      `createTheme: radius must be a number in rem or px, got ${JSON.stringify(radius)}`,
    );
  return radius;
}

/**
 * A selector the generated rule may be scoped to: `:root`, one class, one id, or one `data-`
 * attribute. Nothing that combines selectors, so the rule cannot reach beyond what the caller named.
 */
const SCOPE = /^(?::root|[.#][A-Za-z_][\w-]*|\[data-[a-z-]+(?:="[\w-]+")?\])$/;

export function isScope(scope: unknown): scope is string {
  return typeof scope === "string" && scope.length <= 100 && SCOPE.test(scope);
}

export function assertFont(font: string): string {
  if (font.length > 200 || !FONT.test(font)) {
    throw new Error(
      "createTheme: font must be a short font-family list (letters, digits, spaces, commas, quotes)",
    );
  }
  return font;
}

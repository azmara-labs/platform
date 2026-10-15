import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";

/** Render to an HTML string, as a server would. */
export function renderServer(ui: ReactElement): string {
  return renderToString(ui);
}

/**
 * Assert that `ui` renders on the server, where `window` and `document` do not exist.
 * The test file must opt into the node environment with `// @vitest-environment node`;
 * otherwise jsdom would hide exactly the bug this exists to catch.
 */
export function expectServerSafe(ui: ReactElement): string {
  if (typeof window !== "undefined" || typeof document !== "undefined") {
    throw new Error(
      "expectServerSafe needs a node environment: add `// @vitest-environment node` to the test file",
    );
  }
  try {
    return renderToString(ui);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Component is not server-safe: ${reason}`, { cause: error });
  }
}

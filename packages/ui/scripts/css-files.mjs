import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every stylesheet the package ships: `styles.css`, `tokens.css`, and whatever either (or a file
 * they import) pulls in with a relative `@import "./x.css"`. Derived, not listed, so adding a stylesheet
 * and importing it is enough for it to be copied into `dist` and counted in the size budget.
 */
export function cssFiles(stylesDir = join(import.meta.dirname, "..", "src", "styles")) {
  const found = new Set(["tokens.css", "styles.css"]);
  const queue = ["styles.css", "tokens.css"];
  while (queue.length > 0) {
    const name = queue.pop();
    const text = readFileSync(join(stylesDir, name), "utf8");
    for (const match of text.matchAll(/@import\s+["']\.\/([\w.-]+\.css)["']/g)) {
      const imported = match[1];
      if (!found.has(imported)) {
        found.add(imported);
        queue.push(imported);
      }
    }
  }
  return [...found].sort();
}

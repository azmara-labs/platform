import { copyFileSync, mkdirSync } from "node:fs";
import { cssFiles } from "./css-files.mjs";

// tokens.css: tokens, themes, density, motion tokens and the Tailwind mapping (no global rules).
// styles.css: tokens.css and motion.css plus the global base rules; it imports them by relative path,
// so every file it imports has to ship next to it (cssFiles() derives the list from the imports).
mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
for (const name of cssFiles()) {
  copyFileSync(
    new URL(`../src/styles/${name}`, import.meta.url),
    new URL(`../dist/${name}`, import.meta.url),
  );
}

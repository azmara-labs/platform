import { copyFileSync, mkdirSync } from "node:fs";

// tokens.css: tokens, themes, density, motion and the Tailwind mapping (no global rules).
// styles.css: tokens.css plus the global base rules; it imports tokens.css by relative path.
mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
for (const name of ["tokens.css", "styles.css"]) {
  copyFileSync(
    new URL(`../src/styles/${name}`, import.meta.url),
    new URL(`../dist/${name}`, import.meta.url),
  );
}

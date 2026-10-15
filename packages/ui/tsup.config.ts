import { defineConfig } from "tsup";
import entries from "./build/entries.json" with { type: "json" };

// Two builds so the "use client" directive lands on exactly the entries that
// need it. Client entries (hooks, state, effects, event handlers) carry the
// banner; server entries (`serverComponents`: stateless components, `server`:
// pure code) must not, or Server Components could not import them. What each
// kind may import is enforced after the build by scripts/verify-dist.mjs.
// Shared code between the two is bundled into chunks without a directive.
// `clean` stays off here: the two configs run in parallel and `scripts/clean.mjs`
// empties dist/ before tsup starts.
const shared = {
  format: ["esm"] as ["esm"],
  dts: true,
  clean: false,
  target: "es2022",
  external: ["react", "react-dom", "@azmr/core", "lucide-react"],
};

export default defineConfig([
  { ...shared, entry: entries.client, banner: { js: '"use client";' } },
  { ...shared, entry: { ...entries.serverComponents, ...entries.server } },
]);

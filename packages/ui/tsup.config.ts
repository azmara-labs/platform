import { defineConfig } from "tsup";
import entries from "./build/entries.json" with { type: "json" };

// Two builds so the "use client" directive lands on exactly the entries that
// need it. Client entries (hooks, state, effects, event handlers) carry the
// banner; server-safe entries must not, or Server Components could not import
// them. Shared code between the two is bundled into chunks without a directive.
// `clean` stays off here: the two configs run in parallel and `scripts/clean.mjs`
// empties dist/ before tsup starts.
const shared = {
  format: ["esm"] as ["esm"],
  dts: true,
  clean: false,
  target: "es2022",
  external: ["react", "react-dom", "@azmr/core"],
};

export default defineConfig([
  { ...shared, entry: entries.client, banner: { js: '"use client";' } },
  { ...shared, entry: entries.server },
]);

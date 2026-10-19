import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { rankResults } from "./search-rank";

/**
 * The site's search: Fumadocs' Orama client over the static index at `from` (built at build time
 * by /api/search), with the ranking in search-rank.ts on top. The search dialog and the CI check
 * (scripts/search-check.mts) both use this, so the check tests exactly what readers get.
 */
export function createSearchClient(from = "/api/search") {
  const orama = oramaStaticClient({ from });
  return {
    deps: orama.deps,
    async search(query: string) {
      return rankResults(await orama.search(query), query);
    },
  };
}

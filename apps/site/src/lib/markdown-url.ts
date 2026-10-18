const DOCS_ROOT = "/docs";

/**
 * Where the Markdown version of a docs page is served: the page's address with .md added. The docs
 * home gets an index file inside the docs folder, because a file named like the folder itself is
 * easy to mistake for it. scripts/build-llms.mts writes one to public/ for every docs page.
 */
export function markdownUrl(pageUrl: string): string {
  const clean = pageUrl.replace(/\/+$/, "");
  return clean === DOCS_ROOT ? `${DOCS_ROOT}/index.md` : `${clean}.md`;
}

import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// The search index, built once at build time and served as a static file. The browser downloads it
// the first time someone opens search and searches it locally (Orama), so there is no search
// server, key or third-party crawler. See PAZM-141.
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
  // A page's aliases (frontmatter) go after its title, so "dialog" finds Modal and the result says
  // why: "Modal (Dialog, AlertDialog, Drawer)". src/lib/search-rank.ts ranks on them.
  buildIndex: async (page) => {
    const { title, description, aliases, structuredData } = page.data;
    return {
      title: aliases?.length ? `${title} (${aliases.join(", ")})` : title,
      description,
      url: page.url,
      id: page.url,
      structuredData,
    };
  },
});

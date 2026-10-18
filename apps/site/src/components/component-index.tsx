import { source } from "@/lib/source";
import type { ComponentItem } from "../lib/component-index";
import { ComponentGrid } from "./component-grid";

/**
 * The component index: every page under /docs/components, read from its frontmatter, so a new
 * component page shows up here with no edit to this page. A page that lacks a group, status or
 * version fails the build (the page standard test catches it earlier).
 */
export function ComponentIndex() {
  const items: ComponentItem[] = source
    .getPages()
    .filter((page) => page.url.startsWith("/docs/components/"))
    .map((page) => {
      const { title, description, group, status, since } = page.data;
      if (!group || !status || !since || !description) {
        throw new Error(
          `${page.url} needs description, group, status and since in its frontmatter`,
        );
      }
      return { title, description, url: page.url, group, status, since };
    });

  return <ComponentGrid items={items} />;
}

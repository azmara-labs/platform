import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { docsFrontmatter } from "./src/lib/docs-frontmatter";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: docsFrontmatter,
  },
});

export default defineConfig();

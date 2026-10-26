import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { LazyDemo } from "../demos/lazy";
import type { DemoName } from "../demos/registry";
import { demoSourcePath, isDemoName } from "../lib/demo-name";
import { demoPreview } from "../lib/demo-preview";
import { DemoFrame } from "./demo-frame";
import { DemoSource } from "./demo-source";

/**
 * Embeds a live demo with its source underneath: `<Demo name="button/variants" />`. A long demo
 * shows an excerpt (the JSX it returns) with the full file a click away, not in the page.
 *
 * The component shown and the code shown come from the same file, so they cannot disagree, and
 * `src/demos/demos.test.tsx` renders every demo in CI so none can break unnoticed. The name comes
 * from MDX, so it is validated before it becomes a file path.
 */
export async function Demo({ name }: { name: DemoName }) {
  if (!isDemoName(name)) {
    throw new Error(`Unknown demo ${JSON.stringify(name)}. Register it in src/demos/registry.ts.`);
  }
  const source = await readFile(demoSourcePath(join(process.cwd(), "src", "demos"), name), "utf8");
  // A long demo shows an excerpt; the full file is fetched on request (see demo-preview.ts).
  const preview = demoPreview(source);
  const code = (
    <ServerCodeBlock
      code={preview.code}
      lang="tsx"
      // Copying the excerpt would hand people code that does not run; DemoSource copies the file.
      codeblock={preview.collapsed ? { allowCopy: false } : undefined}
    />
  );

  return (
    <>
      <DemoFrame>
        {/* One demo's JavaScript, loaded by the pages that show it (see demos/lazy.tsx). */}
        <LazyDemo name={name} />
      </DemoFrame>
      {preview.collapsed ? (
        <DemoSource name={name} totalLines={preview.totalLines}>
          {code}
        </DemoSource>
      ) : (
        code
      )}
    </>
  );
}

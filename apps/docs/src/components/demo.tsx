import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { type DemoName, demos } from "../demos/registry";
import { demoSourcePath, isDemoName } from "../lib/demo-name";
import { DemoFrame } from "./demo-frame";

/**
 * Embeds a live demo with its source underneath: `<Demo name="button/variants" />`.
 *
 * The component shown and the code shown come from the same file, so they cannot disagree, and
 * `src/demos/demos.test.tsx` renders every demo in CI so none can break unnoticed. The name comes
 * from MDX, so it is validated before it becomes a file path.
 */
export async function Demo({ name }: { name: DemoName }) {
  if (!isDemoName(name) || !Object.hasOwn(demos, name)) {
    throw new Error(`Unknown demo ${JSON.stringify(name)}. Register it in src/demos/registry.ts.`);
  }
  const Component = demos[name];
  const source = await readFile(demoSourcePath(join(process.cwd(), "src", "demos"), name), "utf8");

  return (
    <>
      <DemoFrame>
        <Component />
      </DemoFrame>
      <ServerCodeBlock code={source.trim()} lang="tsx" />
    </>
  );
}

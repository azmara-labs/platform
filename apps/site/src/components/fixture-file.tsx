import { readFile } from "node:fs/promises";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { fixtureFilePath, fixturesRoot, isFixtureFile, languageOf } from "../lib/fixture-file";

/**
 * Shows a file of a getting-started fixture: `<FixtureFile file="next/app/page.tsx" />`, with the
 * name readers should use for it as the title. The file shown is the file CI builds, so a guide
 * cannot show code that does not work. `src/getting-started.test.ts` checks every reference
 * resolves and that no fixture file is left out of the guides without a reason.
 */
export async function FixtureFile({ file, title }: { file: string; title?: string }) {
  if (!isFixtureFile(file)) throw new Error(`Invalid fixture file ${JSON.stringify(file)}`);
  const source = await readFile(fixtureFilePath(fixturesRoot(process.cwd()), file), "utf8");
  return (
    <ServerCodeBlock
      code={source.trim()}
      lang={languageOf(file)}
      codeblock={{ title: title ?? file.split("/").slice(1).join("/") }}
    />
  );
}

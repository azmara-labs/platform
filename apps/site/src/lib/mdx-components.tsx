import { createFileSystemGeneratorCache, createGenerator } from "fumadocs-typescript";
import { AutoTypeTable, type AutoTypeTableProps } from "fumadocs-typescript/ui";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ComponentIndex } from "../components/component-index";
import { Demo } from "../components/demo";
import { FixtureFile } from "../components/fixture-file";
import { KeyboardMap } from "../components/keyboard-map";
import { PackageIndex } from "../components/package-index";
import { ElevationSample, TokenSwatch } from "../components/token-swatch";

const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
      <AutoTypeTable {...props} generator={generator} />
    ),
    ComponentIndex,
    Demo,
    FixtureFile,
    KeyboardMap,
    PackageIndex,
    TokenSwatch,
    ElevationSample,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

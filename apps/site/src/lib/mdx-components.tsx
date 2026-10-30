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

// Defined once, not inside getMDXComponents: a component created per call is a new type each
// time, so React would remount every type table on each render.
function GeneratedTypeTable(props: Partial<AutoTypeTableProps>) {
  return <AutoTypeTable {...props} generator={generator} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AutoTypeTable: GeneratedTypeTable,
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

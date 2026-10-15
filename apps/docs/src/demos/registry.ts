import type { ComponentType } from "react";
import ButtonIcons from "./button/icons.demo";
import ButtonLoading from "./button/loading.demo";
import ButtonVariants from "./button/variants.demo";
import IconBasic from "./icon/basic.demo";
import IconNamed from "./icon/named.demo";
import InputBasic from "./input/basic.demo";
import InputStates from "./input/states.demo";
import LayoutContainer from "./layout/container.demo";
import LayoutGrid from "./layout/grid.demo";
import LayoutStack from "./layout/stack.demo";
import SpinnerBasic from "./spinner/basic.demo";
import TypographyInline from "./typography/inline.demo";
import TypographyScale from "./typography/scale.demo";

/**
 * Every demo shown on the docs site, by `group/name`. A page embeds one with
 * `<Demo name="button/variants" />`. `demos.test.tsx` renders each entry, runs axe on it, and
 * checks the registry matches the files on disk and the pages that use them, so a demo cannot
 * rot or be forgotten.
 */
export const demos = {
  "button/variants": ButtonVariants,
  "button/loading": ButtonLoading,
  "button/icons": ButtonIcons,
  "icon/basic": IconBasic,
  "icon/named": IconNamed,
  "input/basic": InputBasic,
  "layout/container": LayoutContainer,
  "layout/grid": LayoutGrid,
  "layout/stack": LayoutStack,
  "input/states": InputStates,
  "spinner/basic": SpinnerBasic,
  "typography/inline": TypographyInline,
  "typography/scale": TypographyScale,
} as const satisfies Record<string, ComponentType>;

export type DemoName = keyof typeof demos;

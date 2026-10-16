import type { ComponentType } from "react";
import AvatarBasic from "./avatar/basic.demo";
import ButtonIcons from "./button/icons.demo";
import ButtonLoading from "./button/loading.demo";
import ButtonVariants from "./button/variants.demo";
import AccordionBasic from "./disclosure/accordion.demo";
import CollapsibleBasic from "./disclosure/collapsible.demo";
import TabsBasic from "./disclosure/tabs.demo";
import TabsUrl from "./disclosure/tabs-url.demo";
import DisplayAlerts from "./display/alerts.demo";
import DisplayCards from "./display/cards.demo";
import DisplayChips from "./display/chips.demo";
import DisplayPlaceholders from "./display/placeholders.demo";
import FloatingHoverCard from "./floating/hover-card.demo";
import FloatingPopover from "./floating/popover.demo";
import FloatingTooltip from "./floating/tooltip.demo";
import IconBasic from "./icon/basic.demo";
import IconNamed from "./icon/named.demo";
import InputBasic from "./input/basic.demo";
import InputStates from "./input/states.demo";
import LayoutContainer from "./layout/container.demo";
import LayoutGrid from "./layout/grid.demo";
import LayoutStack from "./layout/stack.demo";
import MenuContext from "./menu/context.demo";
import MenuOpensDialog from "./menu/dialog.demo";
import MenuDropdown from "./menu/dropdown.demo";
import ModalAlertDialog from "./modal/alert-dialog.demo";
import ModalDialog from "./modal/dialog.demo";
import ModalDialogStacked from "./modal/dialog-stacked.demo";
import ModalDrawer from "./modal/drawer.demo";
import ProgressBasic from "./progress/basic.demo";
import ProgressCircular from "./progress/circular.demo";
import ScrollAreaBasic from "./scroll-area/basic.demo";
import SpinnerBasic from "./spinner/basic.demo";
import ToastActions from "./toast/actions.demo";
import ToastPromise from "./toast/promise.demo";
import ToastTypes from "./toast/types.demo";
import TypographyInline from "./typography/inline.demo";
import TypographyScale from "./typography/scale.demo";

/**
 * Every demo shown on the docs site, by `group/name`. A page embeds one with
 * `<Demo name="button/variants" />`. `demos.test.tsx` renders each entry, runs axe on it, and
 * checks the registry matches the files on disk and the pages that use them, so a demo cannot
 * rot or be forgotten.
 */
export const demos = {
  "avatar/basic": AvatarBasic,
  "button/variants": ButtonVariants,
  "button/loading": ButtonLoading,
  "button/icons": ButtonIcons,
  "disclosure/accordion": AccordionBasic,
  "disclosure/collapsible": CollapsibleBasic,
  "disclosure/tabs": TabsBasic,
  "disclosure/tabs-url": TabsUrl,
  "display/alerts": DisplayAlerts,
  "display/cards": DisplayCards,
  "display/chips": DisplayChips,
  "display/placeholders": DisplayPlaceholders,
  "floating/hover-card": FloatingHoverCard,
  "floating/popover": FloatingPopover,
  "floating/tooltip": FloatingTooltip,
  "menu/context": MenuContext,
  "menu/dialog": MenuOpensDialog,
  "menu/dropdown": MenuDropdown,
  "modal/alert-dialog": ModalAlertDialog,
  "modal/dialog": ModalDialog,
  "modal/dialog-stacked": ModalDialogStacked,
  "modal/drawer": ModalDrawer,
  "toast/actions": ToastActions,
  "toast/promise": ToastPromise,
  "toast/types": ToastTypes,
  "icon/basic": IconBasic,
  "icon/named": IconNamed,
  "input/basic": InputBasic,
  "layout/container": LayoutContainer,
  "layout/grid": LayoutGrid,
  "layout/stack": LayoutStack,
  "input/states": InputStates,
  "scroll-area/basic": ScrollAreaBasic,
  "progress/basic": ProgressBasic,
  "progress/circular": ProgressCircular,
  "spinner/basic": SpinnerBasic,
  "typography/inline": TypographyInline,
  "typography/scale": TypographyScale,
} as const satisfies Record<string, ComponentType>;

export type DemoName = keyof typeof demos;

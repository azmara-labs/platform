import type { ComponentType } from "react";
import AvatarBasic from "./avatar/basic.demo";
import BreadcrumbBasic from "./breadcrumb/basic.demo";
import ButtonGroupBasic from "./button/group.demo";
import ButtonIconButton from "./button/icon-button.demo";
import ButtonIcons from "./button/icons.demo";
import ButtonLoading from "./button/loading.demo";
import ButtonVariants from "./button/variants.demo";
import CustomisingClassOverride from "./customising/class-override.demo";
import CustomisingLinkAsButton from "./customising/link-as-button.demo";
import CustomisingWrappedButton from "./customising/wrapped-button.demo";
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
import MotionCheck from "./motion/check.demo";
import MotionCollapse from "./motion/collapse.demo";
import MotionCountUp from "./motion/count-up.demo";
import MotionGallery from "./motion/gallery.demo";
import MotionReduced from "./motion/reduced.demo";
import MotionReorder from "./motion/reorder.demo";
import MotionStagger from "./motion/stagger.demo";
import PaginationLinks from "./pagination/links.demo";
import PaginationState from "./pagination/state.demo";
import ProgressBasic from "./progress/basic.demo";
import ProgressCircular from "./progress/circular.demo";
import ScrollAreaBasic from "./scroll-area/basic.demo";
import SpinnerBasic from "./spinner/basic.demo";
import SplitButtonBasic from "./split-button/basic.demo";
import StepperBasic from "./stepper/basic.demo";
import TableBasic from "./table/basic.demo";
import TableSticky from "./table/sticky.demo";
import ToastActions from "./toast/actions.demo";
import ToastPromise from "./toast/promise.demo";
import ToastTypes from "./toast/types.demo";
import ToggleGroupBasic from "./toggle/group.demo";
import ToggleBasic from "./toggle/toggle.demo";
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
  "breadcrumb/basic": BreadcrumbBasic,
  "customising/class-override": CustomisingClassOverride,
  "customising/link-as-button": CustomisingLinkAsButton,
  "customising/wrapped-button": CustomisingWrappedButton,
  "button/group": ButtonGroupBasic,
  "button/icon-button": ButtonIconButton,
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
  "stepper/basic": StepperBasic,
  "table/basic": TableBasic,
  "table/sticky": TableSticky,
  "toast/actions": ToastActions,
  "toast/promise": ToastPromise,
  "toast/types": ToastTypes,
  "motion/check": MotionCheck,
  "motion/collapse": MotionCollapse,
  "motion/count-up": MotionCountUp,
  "motion/gallery": MotionGallery,
  "motion/reduced": MotionReduced,
  "motion/reorder": MotionReorder,
  "motion/stagger": MotionStagger,
  "pagination/links": PaginationLinks,
  "pagination/state": PaginationState,
  "split-button/basic": SplitButtonBasic,
  "toggle/group": ToggleGroupBasic,
  "toggle/toggle": ToggleBasic,
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

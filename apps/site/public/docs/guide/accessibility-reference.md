# Accessibility reference

> Which components take keyboard input, every component's key map in one place, and what is checked for each page.

Source: https://platform.azmara.io/docs/guide/accessibility-reference

This page is generated from the component pages when the docs are built, so it lists every component and cannot drift from them. For what is tested and what is not, see [Accessibility](https://platform.azmara.io/docs/guide/accessibility.md).

## By component

| Component                                                                 | Group        | Takes keyboard input | Key map rows | Live demos (axe-checked) | Notes                                                                                     |
| ------------------------------------------------------------------------- | ------------ | -------------------- | ------------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| [Layout](https://platform.azmara.io/docs/components/layout.md)            | Layout       | No                   | n/a          | 3                        | [Accessibility](https://platform.azmara.io/docs/components/layout.md#accessibility)       |
| [ScrollArea](https://platform.azmara.io/docs/components/scroll-area.md)   | Layout       | Yes                  | 5            | 1                        | [Accessibility](https://platform.azmara.io/docs/components/scroll-area.md#accessibility)  |
| [Button](https://platform.azmara.io/docs/components/button.md)            | Inputs       | Yes                  | 3            | 5                        | [Accessibility](https://platform.azmara.io/docs/components/button.md#accessibility)       |
| [SplitButton](https://platform.azmara.io/docs/components/split-button.md) | Inputs       | Yes                  | 4            | 1                        | [Accessibility](https://platform.azmara.io/docs/components/split-button.md#accessibility) |
| [Input](https://platform.azmara.io/docs/components/input.md)              | Inputs       | Yes                  | 3            | 2                        | [Accessibility](https://platform.azmara.io/docs/components/input.md#accessibility)        |
| [Toggle](https://platform.azmara.io/docs/components/toggle.md)            | Inputs       | Yes                  | 4            | 2                        | [Accessibility](https://platform.azmara.io/docs/components/toggle.md#accessibility)       |
| [Display](https://platform.azmara.io/docs/components/display.md)          | Data display | Yes                  | 2            | 4                        | [Accessibility](https://platform.azmara.io/docs/components/display.md#accessibility)      |
| [Table](https://platform.azmara.io/docs/components/table.md)              | Data display | Yes                  | 3            | 2                        | [Accessibility](https://platform.azmara.io/docs/components/table.md#accessibility)        |
| [Avatar](https://platform.azmara.io/docs/components/avatar.md)            | Data display | No                   | n/a          | 1                        | [Accessibility](https://platform.azmara.io/docs/components/avatar.md#accessibility)       |
| [Typography](https://platform.azmara.io/docs/components/typography.md)    | Data display | No                   | n/a          | 2                        | [Accessibility](https://platform.azmara.io/docs/components/typography.md#accessibility)   |
| [Icon](https://platform.azmara.io/docs/components/icon.md)                | Data display | No                   | n/a          | 2                        | [Accessibility](https://platform.azmara.io/docs/components/icon.md#accessibility)         |
| [Disclosure](https://platform.azmara.io/docs/components/disclosure.md)    | Data display | Yes                  | 8            | 4                        | [Accessibility](https://platform.azmara.io/docs/components/disclosure.md#accessibility)   |
| [Progress](https://platform.azmara.io/docs/components/progress.md)        | Feedback     | No                   | n/a          | 2                        | [Accessibility](https://platform.azmara.io/docs/components/progress.md#accessibility)     |
| [Spinner](https://platform.azmara.io/docs/components/spinner.md)          | Feedback     | No                   | n/a          | 1                        | [Accessibility](https://platform.azmara.io/docs/components/spinner.md#accessibility)      |
| [Toast](https://platform.azmara.io/docs/components/toast.md)              | Feedback     | Yes                  | 3            | 3                        | [Accessibility](https://platform.azmara.io/docs/components/toast.md#accessibility)        |
| [Floating](https://platform.azmara.io/docs/components/floating.md)        | Overlays     | Yes                  | 4            | 3                        | [Accessibility](https://platform.azmara.io/docs/components/floating.md#accessibility)     |
| [Modal](https://platform.azmara.io/docs/components/modal.md)              | Overlays     | Yes                  | 3            | 4                        | [Accessibility](https://platform.azmara.io/docs/components/modal.md#accessibility)        |
| [Menu](https://platform.azmara.io/docs/components/menu.md)                | Overlays     | Yes                  | 10           | 3                        | [Accessibility](https://platform.azmara.io/docs/components/menu.md#accessibility)         |
| [Breadcrumb](https://platform.azmara.io/docs/components/breadcrumb.md)    | Navigation   | Yes                  | 2            | 1                        | [Accessibility](https://platform.azmara.io/docs/components/breadcrumb.md#accessibility)   |
| [Pagination](https://platform.azmara.io/docs/components/pagination.md)    | Navigation   | Yes                  | 3            | 2                        | [Accessibility](https://platform.azmara.io/docs/components/pagination.md#accessibility)   |
| [Stepper](https://platform.azmara.io/docs/components/stepper.md)          | Navigation   | Yes                  | 1            | 1                        | [Accessibility](https://platform.azmara.io/docs/components/stepper.md#accessibility)      |
| [Motion](https://platform.azmara.io/docs/components/motion.md)            | Utils        | No                   | n/a          | 7                        | [Accessibility](https://platform.azmara.io/docs/components/motion.md#accessibility)       |

"Live demos" counts the demos embedded on the page. The docs tests render every demo and fail on an axe violation, so each one is accessibility-checked. "Key map rows" counts the rows of the key map on the page.

## Keyboard reference

15 components take keyboard input. Each key map below is the one on the component's own page.

### [ScrollArea](https://platform.azmara.io/docs/components/scroll-area.md#accessibility)

| Key                         | Action                                           |
| --------------------------- | ------------------------------------------------ |
| `Tab`                       | Moves focus to the scrollable region.            |
| `ArrowDown` or `ArrowUp`    | Scrolls the region vertically.                   |
| `ArrowRight` or `ArrowLeft` | Scrolls horizontally when it overflows that way. |
| `PageDown` or `PageUp`      | Scrolls by a page.                               |
| `Home` or `End`             | Scrolls to the start or end.                     |

### [Button](https://platform.azmara.io/docs/components/button.md#accessibility)

| Key                | Action                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `Enter` or `Space` | Activates the button. Ignored while loading.                        |
| `Tab`              | Moves focus to the button. A loading button stays in the tab order. |
| `Shift` or `Tab`   | Moves focus to the previous control.                                |

### [SplitButton](https://platform.azmara.io/docs/components/split-button.md#accessibility)

| Key                | Action                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `Tab`              | Moves to the main button, then to the arrow button.                        |
| `Enter` or `Space` | On the main button: runs the primary action. On the arrow: opens the menu. |
| `ArrowDown`        | On the arrow button: opens the menu on its first item.                     |
| `Escape`           | Closes the menu and returns focus to the arrow button.                     |

### [Input](https://platform.azmara.io/docs/components/input.md#accessibility)

| Key              | Action                                                              |
| ---------------- | ------------------------------------------------------------------- |
| `Tab`            | Moves focus into and out of the field. Disabled inputs are skipped. |
| `Shift` or `Tab` | Moves focus to the previous control.                                |
| `Esc`            | Not captured, so a parent dialog can use it to close.               |

### [Toggle](https://platform.azmara.io/docs/components/toggle.md#accessibility)

| Key                         | Action                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Tab`                       | Enters the group at a single tab stop, then moves on. Only one item is in the tab order at a time (roving tabindex).      |
| `ArrowRight` or `ArrowLeft` | Moves focus to the next or previous item and wraps (ArrowDown and ArrowUp when vertical). It never changes the selection. |
| `Home` or `End`             | Moves focus to the first or last item.                                                                                    |
| `Space` or `Enter`          | Presses or releases the focused item.                                                                                     |

### [Display](https://platform.azmara.io/docs/components/display.md#accessibility)

| Key                | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `Tab`              | Moves focus to the dismiss button of an Alert that has one. |
| `Enter` or `Space` | Dismisses the Alert (calls onDismiss).                      |

### [Table](https://platform.azmara.io/docs/components/table.md#accessibility)

| Key                                                     | Action                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Tab`                                                   | Moves to the scroll region when the table has a label. Nothing else in a static table is focusable. |
| `ArrowDown` or `ArrowUp` or `ArrowRight` or `ArrowLeft` | Scrolls a focused, labelled region.                                                                 |
| `PageDown` or `PageUp` or `Home` or `End`               | Scrolls by a page, or to the start or end.                                                          |

### [Disclosure](https://platform.azmara.io/docs/components/disclosure.md#accessibility)

#### Accordion keys

| Key                      | Action                                                                            |
| ------------------------ | --------------------------------------------------------------------------------- |
| `Tab`                    | Moves to the next trigger (or the first focusable element in an open panel).      |
| `Enter` or `Space`       | Opens or closes the focused section.                                              |
| `ArrowDown` or `ArrowUp` | Moves focus to the next or previous trigger and wraps. It does not open anything. |
| `Home` or `End`          | Moves focus to the first or last trigger.                                         |

#### Tabs keys

| Key                         | Action                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| `Tab`                       | Enters the tab list at the selected tab, then moves on to the panel.      |
| `ArrowRight` or `ArrowLeft` | Moves focus between tabs and wraps (ArrowDown and ArrowUp when vertical). |
| `Home` or `End`             | Moves focus to the first or last tab.                                     |
| `Enter` or `Space`          | Selects the focused tab (not needed with activateOnFocus).                |

### [Toast](https://platform.azmara.io/docs/components/toast.md#accessibility)

| Key                  | Action                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `F6`                 | Moves focus into the notifications region. Tab then moves between the actions and close buttons. |
| `Tab` or `Shift+Tab` | Moves between the toasts' buttons. The timers pause while focus is inside.                       |
| `Enter` or `Space`   | Activates the focused action or close button.                                                    |

### [Floating](https://platform.azmara.io/docs/components/floating.md#accessibility)

| Key                  | Action                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| `Tab`                | Focusing a tooltip trigger or hover-card link shows its surface; leaving hides it. |
| `Enter` or `Space`   | Opens a popover from its trigger.                                                  |
| `Tab` or `Shift+Tab` | Moves through the content of an open popover.                                      |
| `Escape`             | Closes the open tooltip, popover or hover card. Focus returns to the trigger.      |

### [Modal](https://platform.azmara.io/docs/components/modal.md#accessibility)

| Key                  | Action                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `Tab` or `Shift+Tab` | Moves through the controls inside the surface and wraps at the ends. |
| `Escape`             | Closes the top surface. Focus returns to the control that opened it. |
| `Enter` or `Space`   | Opens from a trigger, and activates the focused button inside.       |

### [Menu](https://platform.azmara.io/docs/components/menu.md#accessibility)

| Key                               | Action                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Enter` or `Space` or `ArrowDown` | On the trigger: opens the menu on the first item.                                                          |
| `ArrowUp`                         | On the trigger: opens the menu on the last item.                                                           |
| `ArrowDown` or `ArrowUp`          | Moves to the next or previous item and wraps at the ends.                                                  |
| `Home` or `End`                   | Jumps to the first or last item.                                                                           |
| `A–Z`                             | Typeahead: jumps to the item that starts with the letters you type. Letters typed together are one search. |
| `Enter` or `Space`                | Runs the focused item and closes the menu. A checkbox or radio item toggles.                               |
| `ArrowRight`                      | On a submenu trigger: opens the submenu and focuses its first item.                                        |
| `ArrowLeft`                       | In a submenu: closes it and returns to its trigger.                                                        |
| `Escape`                          | Closes the open submenu, or the menu. Focus returns to the trigger.                                        |
| `Tab`                             | Closes the menu and moves on. Focus is never trapped.                                                      |

### [Breadcrumb](https://platform.azmara.io/docs/components/breadcrumb.md#accessibility)

| Key     | Action                                                                                   |
| ------- | ---------------------------------------------------------------------------------------- |
| `Tab`   | Moves through the links in order. The current page and the separators are not focusable. |
| `Enter` | Follows the focused link.                                                                |

### [Pagination](https://platform.azmara.io/docs/components/pagination.md#accessibility)

| Key     | Action                                                                      |
| ------- | --------------------------------------------------------------------------- |
| `Tab`   | Moves through the page controls. A disabled Previous or Next is skipped.    |
| `Enter` | Follows a link, or activates a button.                                      |
| `Space` | Activates a button page. (Links respond to Enter only, as native links do.) |

### [Stepper](https://platform.azmara.io/docs/components/stepper.md#accessibility)

| Key   | Action                                                       |
| ----- | ------------------------------------------------------------ |
| `Tab` | Nothing in a stepper is focusable: it only reports progress. |

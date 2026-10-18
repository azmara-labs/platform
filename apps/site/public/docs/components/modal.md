# Modal

> Dialog, AlertDialog and Drawer. Surfaces that take over the screen, with a focus trap, an inert page, scroll lock and focus return. Built on Base UI.

Source: https://platform.azmara.io/docs/components/modal

Group: Overlays · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from "@azmr/ui/modal";
```

These are interactive, so they are client components. Every modal surface does the same four things while it is open:

- **Traps focus.** Tab and Shift+Tab stay inside. At the ends focus wraps.
- **Makes the page inert.** The page behind is hidden from assistive technology and cannot be focused.
- **Locks scroll.** The page does not scroll behind it.
- **Returns focus.** Closing puts focus back on the control that opened it.

They render in a portal above the page, with a scrim (`--scrim`) behind them on the `--z-overlay` layer and the surface on `--z-modal`.

| You need                                                         | Use           |
| ---------------------------------------------------------------- | ------------- |
| A task or form that needs the person's full attention            | `Dialog`      |
| A yes or no before something destructive or irreversible         | `AlertDialog` |
| A side panel or a bottom sheet (filters, details, a mobile menu) | `Drawer`      |

## Dialog

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@azmr/ui/modal";

export default function DialogBasic() {
  return (
    <Dialog>
      <DialogTrigger render={<Button>Edit profile</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Change how you appear to the rest of your team.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display name
            </label>
            <Input id="display-name" defaultValue="Aroha Ngata" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <DialogClose render={<Button type="submit">Save changes</Button>} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Name every dialog with `DialogTitle` and describe it with `DialogDescription`; they become the dialog's accessible name and description. Escape, the corner close button (`showClose`, on by default) and a click on the scrim all close it. Set `disablePointerDismissal` on `Dialog` when an accidental click outside must not lose the person's work.

`size` is `sm`, `md` (default), `lg`, `xl` or `full`. Every size stays inside the viewport, and a dialog taller than the screen scrolls inside the viewport instead of running off it.

### Stacked dialogs

```tsx
import { Button } from "@azmr/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@azmr/ui/modal";

export default function DialogStacked() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Open the first dialog</Button>} />
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Press Escape to close only the top dialog: the one underneath stays open.
          </DialogDescription>
        </DialogHeader>
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="secondary" className="justify-self-start">
                Review permissions
              </Button>
            }
          />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Permissions</DialogTitle>
              <DialogDescription>Invited people can view and comment.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button>Got it</Button>} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
```

A dialog can open another. Escape closes only the top one, focus is trapped in the top one, and closing it returns focus to the control that opened it, which sits inside the dialog underneath.

## AlertDialog

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@azmr/ui/modal";
import { useState } from "react";

export default function AlertDialogBasic() {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive">Delete project</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Its files and history are removed for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleted(true)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {deleted ? "Project deleted." : "Focus starts on “Keep it”, never on “Delete”."}
      </p>
    </div>
  );
}
```

An alert dialog interrupts to ask for a decision. It differs from a `Dialog` in three ways, all deliberate:

1. It is announced as an **alert dialog**.
2. A click outside does **not** close it. The person has to choose.
3. Focus starts on `AlertDialogCancel`, the least destructive choice, **even when the destructive button comes first in the page order**. Pressing Enter by reflex cannot delete anything. If there is no `AlertDialogCancel`, focus starts on the first control.

`AlertDialogAction` is destructive by default; pass `tone="default"` for a plain confirmation. It runs its `onClick` and then closes the dialog. Escape cancels.

## Drawer

```tsx
import { Button } from "@azmr/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  type DrawerSide,
  DrawerTitle,
  DrawerTrigger,
} from "@azmr/ui/modal";

const sides: DrawerSide[] = ["right", "left", "top", "bottom"];

export default function DrawerBasic() {
  return (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <Drawer key={side} side={side}>
          <DrawerTrigger render={<Button variant="outline">From the {side}</Button>} />
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
              <DrawerDescription>
                On a touch screen, swipe toward the {side} to dismiss.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose render={<Button>Apply</Button>} />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  );
}
```

A drawer slides in from `side` (`right` by default, `left`, `top` or `bottom`) and is a full modal. On touch it can be dismissed by swiping back toward the edge it came from; the panel follows the finger exactly and the scrim fades with the swipe. Gesture handling comes from Base UI's drawer, so there is no extra module to install.

## Motion

The scrim fades and a dialog fades and scales in from slightly smaller, using `--motion-duration-base`. A drawer slides on `--motion-duration-slow`. Under `prefers-reduced-motion` those tokens collapse to near zero, so everything appears and disappears instantly. While a finger is dragging a drawer there is no easing at all, so it tracks exactly.

## Accessibility

| Key                  | Action                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `Tab` or `Shift+Tab` | Moves through the controls inside the surface and wraps at the ends. |
| `Escape`             | Closes the top surface. Focus returns to the control that opened it. |
| `Enter` or `Space`   | Opens from a trigger, and activates the focused button inside.       |

- The surface is named by its title and described by its description. Always include a title.
- The corner close button is labelled "Close"; its icon is decorative.
- The scrim colour is a token, so it follows light and dark mode and scoped themes.

## Props

| Prop        | Type                                                  | Default | Required | Description                                                                       |
| ----------- | ----------------------------------------------------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `className` | `string`                                              |         | No       |                                                                                   |
| `size`      | `"sm" \| "md" \| "lg" \| "xl" \| "full" \| undefined` |         | No       | Maximum width. Default `md`. All sizes stay inside the viewport on small screens. |
| `showClose` | `boolean \| undefined`                                |         | No       | Show the corner close button (labelled "Close"). Default true.                    |

| Prop                      | Type                                                                                                                          | Default | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `side`                    | `"top" \| "right" \| "bottom" \| "left" \| undefined`                                                                         |         | No       | The edge it slides in from. Default `right`. It is dismissed by swiping back toward that edge.                                                                                                                                                                                                                                                                                                                                                            |
| `children`                | `React.ReactNode \| PayloadChildRenderFunction<unknown>`                                                                      |         | No       | The content of the drawer.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `open`                    | `boolean \| undefined`                                                                                                        |         | No       | Whether the drawer is currently open.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `modal`                   | `boolean \| "trap-focus" \| undefined`                                                                                        | `true`  | No       | Determines if the drawer enters a modal state when open. - `true`: user interaction is limited to just the drawer: focus is trapped, document page scroll is locked, and pointer interactions on outside elements are disabled. - `false`: user interaction with the rest of the document is allowed. - `'trap-focus'`: focus is trapped inside the drawer, but document page scroll is not locked and pointer interactions outside of it remain enabled. |
| `disablePointerDismissal` | `boolean \| undefined`                                                                                                        | `false` | No       | Whether to prevent the drawer from closing on outside presses. For non-modal drawers, this also prevents the drawer from closing when focus moves outside of it.                                                                                                                                                                                                                                                                                          |
| `defaultOpen`             | `boolean \| undefined`                                                                                                        | `false` | No       | Whether the drawer is initially open. To render a controlled drawer, use the `open` prop instead.                                                                                                                                                                                                                                                                                                                                                         |
| `onOpenChange`            | `((open: boolean, eventDetails: DrawerPrimitive.Root.ChangeEventDetails) => void) \| undefined`                               |         | No       | Event handler called when the drawer is opened or closed.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `onOpenChangeComplete`    | `((open: boolean) => void) \| undefined`                                                                                      |         | No       | Event handler called after any animations complete when the drawer is opened or closed.                                                                                                                                                                                                                                                                                                                                                                   |
| `actionsRef`              | `React.RefObject<DrawerRootActions \| null> \| undefined`                                                                     |         | No       | A ref to imperative actions. - `unmount`: Ends the closing phase of the drawer after an externally controlled closing animation finishes. Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the drawer completes closing on its own. Whether it leaves the DOM is decided by `keepMounted` on the portal. - `close`: Closes the drawer imperatively when called.                                                                          |
| `handle`                  | `DrawerPrimitive.Handle<unknown> \| undefined`                                                                                |         | No       | A handle to associate the drawer with a trigger. If specified, allows detached triggers to control the drawer's open state. Can be created with the Drawer.createHandle() method.                                                                                                                                                                                                                                                                         |
| `triggerId`               | `string \| null \| undefined`                                                                                                 |         | No       | ID of the trigger that the drawer is associated with. This is useful in conjunction with the `open` prop to create a controlled drawer. There's no need to specify this prop when the drawer is uncontrolled (that is, when the `open` prop is not set).                                                                                                                                                                                                  |
| `defaultTriggerId`        | `string \| null \| undefined`                                                                                                 |         | No       | ID of the trigger that the drawer is associated with. This is useful in conjunction with the `defaultOpen` prop to create an initially open drawer.                                                                                                                                                                                                                                                                                                       |
| `snapPoints`              | `DrawerSnapPoint[] \| undefined`                                                                                              |         | No       | Snap points used to position the drawer. Use numbers between 0 and 1 to represent fractions of the viewport height, numbers greater than 1 as pixel values, or strings in `px`/`rem` units (for example, `'148px'` or `'30rem'`).                                                                                                                                                                                                                         |
| `snapToSequentialPoints`  | `boolean \| undefined`                                                                                                        | `false` | No       | Disables velocity-based snap skipping so drag distance determines the next snap point.                                                                                                                                                                                                                                                                                                                                                                    |
| `snapPoint`               | `DrawerSnapPoint \| null \| undefined`                                                                                        |         | No       | The currently active snap point. Use with `onSnapPointChange` to control the snap point.                                                                                                                                                                                                                                                                                                                                                                  |
| `defaultSnapPoint`        | `DrawerSnapPoint \| null \| undefined`                                                                                        |         | No       | The initial snap point value when uncontrolled.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `onSnapPointChange`       | `((snapPoint: DrawerSnapPoint \| null, eventDetails: DrawerPrimitive.Root.SnapPointChangeEventDetails) => void) \| undefined` |         | No       | Callback fired when the snap point changes.                                                                                                                                                                                                                                                                                                                                                                                                               |

The rest are Base UI's props, passed through (`open`, `defaultOpen`, `onOpenChange`, `modal`, `initialFocus`, `finalFocus`, and so on).

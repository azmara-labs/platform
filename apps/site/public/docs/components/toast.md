# Toast

> Short notifications raised from anywhere with toast.success(), toast.error() and toast.promise(). Stacked, pausable, swipeable and announced to screen readers. Built on Base UI.

Source: https://platform.azmara.io/docs/components/toast

Group: Feedback · Status: stable · Added in @azmr/ui 0.2.0

## Usage

Mount one `Toaster` near the root of your app, then raise toasts from anywhere, including outside React.

```tsx
import { Toaster, toast } from "@azmr/ui/toast";

// Once, in the root layout:
<Toaster />

// Anywhere:
toast.success("Invoice sent");
```

`Toaster` is a client component. A toast raised before it has mounted has nowhere to render, so put it in the layout rather than in a page.

This site has a `Toaster` in its layout, so the demos below raise real toasts in the corner of the screen.

## Types

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";

export default function ToastTypes() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast("Draft saved")}>
        Plain
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success("Invoice sent", { description: "Aroha will get it within a minute." })
        }
      >
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.info("New version available")}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Your plan renews tomorrow")}>
        Warning
      </Button>
      {/* Errors are announced urgently (role="alert"); the others politely. */}
      <Button
        variant="outline"
        onClick={() => toast.error("Could not save", { description: "Check your connection." })}
      >
        Error
      </Button>
    </div>
  );
}
```

| Call            | Icon     | Announced                     |
| --------------- | -------- | ----------------------------- |
| `toast(title)`  | none     | politely                      |
| `toast.success` | check    | politely                      |
| `toast.info`    | info     | politely                      |
| `toast.warning` | triangle | politely                      |
| `toast.error`   | alert    | **urgently** (`role="alert"`) |
| `toast.loading` | spinner  | politely                      |

Each takes `(title, options)`. Options: `description`, `duration`, `id`, `priority`, `action` and `onClose`. Every call returns the toast's id.

Icons are decorative; the type is also in the text you write. Do not rely on colour alone.

## Actions and updating a toast

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";
import { useState } from "react";

export default function ToastActions() {
  const [items, setItems] = useState(["Quarterly report", "Team photo"]);

  function remove(name: string) {
    setItems((all) => all.filter((n) => n !== name));
    toast(`Deleted “${name}”`, {
      // The same id replaces the toast instead of stacking another.
      id: `deleted-${name}`,
      action: {
        label: "Undo",
        onClick: () => setItems((all) => (all.includes(name) ? all : [...all, name])),
      },
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((name) => (
          <li key={name} className="flex items-center gap-3">
            {name}
            <Button size="sm" variant="ghost" onClick={() => remove(name)}>
              Delete
            </Button>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted-foreground">Nothing left.</li>}
      </ul>
    </div>
  );
}
```

`action: { label, onClick }` adds a button, and the toast dismisses itself after it runs. Undo is the classic use.

Giving a toast an `id` that is already showing **updates it instead of stacking another**, so repeating an action does not flood the screen. `toast.update(id, { title, type, … })` changes a toast in place, and `toast.dismiss(id)` removes one (`toast.dismiss()` removes them all).

## Promises

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { toast } from "@azmr/ui/toast";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ToastPromise() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(
            wait(1500).then(() => 12),
            {
              loading: "Exporting…",
              success: (rows) => `Exported ${rows} rows`,
              error: "Export failed",
            },
          )
        }
      >
        Export (succeeds)
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast
            .promise(
              wait(1500).then(() => Promise.reject(new Error("Disk full"))),
              {
                loading: "Exporting…",
                success: "Exported",
                error: (e: Error) => `Export failed: ${e.message}`,
              },
            )
            .catch(() => {})
        }
      >
        Export (fails)
      </Button>
    </div>
  );
}
```

`toast.promise(promise, { loading, success, error })` shows a loading toast, then replaces it with the result. `success` and `error` can be functions of the value or the error. It returns the same promise, so it still rejects for you to handle; a failure is announced urgently.

## Timing

A toast dismisses itself after `duration` (5000 ms by default; set it on the `Toaster` or per toast). `duration: 0` keeps it until dismissed, and `toast.loading` never times out. The timer **pauses while the pointer is over the stack or focus is inside it**, so nobody loses a toast they are reading.

Do not use a toast for anything the person must act on. Auto-dismissing messages are easy to miss, so keep errors that need a decision in the page (or an `AlertDialog`).

## Stacking and position

The `Toaster` shows `limit` toasts (3 by default); older ones wait behind and the stack fans out on hover or focus. `position` is `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center` or `bottom-right` (default), and new toasts come in from that edge. The stack sits on the `--z-toast` layer, above dialogs and menus.

## Motion

Toasts slide in from their edge, fade out, and the stack reflows on `--motion-duration-slow`. Under `prefers-reduced-motion` those collapse to near zero. While a finger is dragging a toast there is no easing, so it tracks exactly.

## Accessibility

| Key                  | Action                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `F6`                 | Moves focus into the notifications region. Tab then moves between the actions and close buttons. |
| `Tab` or `Shift+Tab` | Moves between the toasts' buttons. The timers pause while focus is inside.                       |
| `Enter` or `Space`   | Activates the focused action or close button.                                                    |

- The region is named "Notifications" (change it with `label`) and is a polite live region. Errors are also written to a separate alert, so they are spoken at once.
- The close button is labelled "Dismiss notification"; its icon is decorative.
- A toast can be swiped away toward the edge it came from on touch.

## Props

| Prop        | Type                                                                                                           | Default | Required | Description                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `position`  | `"top-left" \| "top-center" \| "top-right" \| "bottom-left" \| "bottom-center" \| "bottom-right" \| undefined` |         | No       | Where the stack sits. Default `bottom-right`. New toasts come in from that edge.    |
| `limit`     | `number`                                                                                                       |         | No       | The most toasts shown at once; older ones wait behind. Default 3.                   |
| `duration`  | `number`                                                                                                       |         | No       | Default milliseconds before a toast dismisses itself. `0` never does. Default 5000. |
| `label`     | `string`                                                                                                       |         | No       | The accessible name of the notifications region. Default "Notifications".           |
| `className` | `string`                                                                                                       |         | No       |                                                                                     |

| Prop          | Type                                                       | Default | Required | Description                                                                                                                                              |
| ------------- | ---------------------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `description` | `ReactNode`                                                |         | No       | A second line under the title.                                                                                                                           |
| `duration`    | `number`                                                   |         | No       | Milliseconds before it dismisses itself. `0` keeps it until dismissed. Defaults to the `Toaster`'s `duration` (5000), and loading toasts never time out. |
| `id`          | `string`                                                   |         | No       | Showing a toast with an id that is already visible updates that toast instead of stacking another.                                                       |
| `priority`    | `"low" \| "high" \| undefined`                             |         | No       | `high` is announced urgently (`role="alert"`), `low` politely. Errors are `high` by default, everything else `low`.                                      |
| `action`      | `{ label: ReactNode; onClick?: () => void; } \| undefined` |         | No       | A button in the toast, such as Undo. It runs `onClick` and then dismisses the toast.                                                                     |
| `onClose`     | `(() => void) \| undefined`                                |         | No       | Called when the toast is dismissed, by the person or by the timer.                                                                                       |

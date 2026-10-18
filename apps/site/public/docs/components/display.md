# Display

> Card, Badge, Alert, Skeleton and EmptyState. Server Components with status colours checked for contrast in both themes.

Source: https://platform.azmara.io/docs/components/display

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Card, Badge, Alert, Skeleton, EmptyState } from "@azmr/ui/display";
```

All of these are **Server Components**: no hooks, no `"use client"`.

## Card and Badge

```tsx
import { Button } from "@azmr/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@azmr/ui/display";

export default function DisplayCards() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Business plan</CardTitle>
        <CardDescription>
          <Badge variant="success">Active</Badge> Renews on 1 November
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        Up to 25 users, priority support and audit logs.
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Manage plan</Button>
        <Button size="sm" variant="ghost">
          View invoices
        </Button>
      </CardFooter>
    </Card>
  );
}
```

A `Card` is a bordered surface from tokens, with `CardHeader`, `CardTitle` (an `h3` by default; pass `as` to fit your outline), `CardDescription`, `CardContent` and `CardFooter`. A `Badge` is a small label for status or a count, with the semantic variants `info`, `success`, `warning` and `destructive`.

## Chip

```tsx
"use client";

import { Chip } from "@azmr/ui/display";
import { useState } from "react";

export default function DisplayChips() {
  const [tags, setTags] = useState(["React", "Accessibility", "Tailwind", "Base UI"]);

  // The Chip does not hide itself: you own the list.
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Chip
          key={tag}
          variant="secondary"
          onRemove={() => setTags((all) => all.filter((t) => t !== tag))}
        >
          {tag}
        </Chip>
      ))}
      {tags.length === 0 && <span className="text-sm text-muted-foreground">No tags left.</span>}
    </div>
  );
}
```

A `Chip` is a Badge that can be removed: a selected filter, a tag. `onRemove` adds a button named `Remove <label>` (`removeLabel` for non-text content or another language), reachable and operable with Tab, Enter and Space. The Chip does not hide itself; you own the list.

## Alert

```tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@azmr/ui/display";
import { useState } from "react";

export default function DisplayAlerts() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Alert variant="info">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes are live.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Plan renews tomorrow</AlertTitle>
        <AlertDescription>Update your card to avoid an interruption.</AlertDescription>
      </Alert>
      {/* The Alert does not hide itself: you own that state. */}
      {!dismissed && (
        <Alert variant="destructive" onDismiss={() => setDismissed(true)}>
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>We could not charge the card on file.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

Problems (`warning`, `destructive`) are announced assertively with `role="alert"`; `info` and `success` politely with `role="status"`, so a screen reader is not interrupted for good news. An icon is shown per variant (replace it with `icon`, remove it with `icon={null}`). `onDismiss` adds a labelled dismiss button (`dismissLabel` to localise it); the Alert does not hide itself, so you own that state. The dismiss handler works when the Alert is rendered from a Client Component.

## Badge, Skeleton and EmptyState

```tsx
import { Button } from "@azmr/ui/button";
import { Badge, EmptyState, Skeleton } from "@azmr/ui/display";
import { Icon } from "@azmr/ui/icons";
import { Inbox } from "lucide-react";

export default function DisplayPlaceholders() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>

      {/* Mark the loading container aria-busy; the skeleton itself is decorative. */}
      <div aria-busy="true" className="flex max-w-xs items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      <EmptyState
        icon={<Icon icon={Inbox} size="xl" />}
        title="No messages yet"
        description="When customers write to you, their messages will appear here."
        action={<Button size="sm">Compose a message</Button>}
      />
    </div>
  );
}
```

- **`Skeleton`** is a decorative placeholder (`aria-hidden`). Mark the loading container `aria-busy` and announce the result instead. It pulses, and the global reduced-motion rule stills it for people who ask.
- **`EmptyState`** says what is missing and what to do about it: a title, optional description, icon and action, with a heading level (`headingLevel`) that fits your page outline.

## Status colours are checked

Alerts and badges paint a tint of a status colour over the page and put text on it. The test suite computes the contrast on the **blended surface**, in light and dark, over both the page and a card, from the same class names the components use: body text at 4.5:1 or better, badge text at 4.5:1, icons at 3:1. This caught a real failure while the components were being built (the destructive badge was 4.26:1 on a dark card), so its tint is lighter than first designed.

## Props

| Prop           | Type                                                             | Default | Required | Description                                                                                |
| -------------- | ---------------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------ |
| `variant`      | `"info" \| "success" \| "warning" \| "destructive" \| undefined` |         | No       |                                                                                            |
| `icon`         | `ReactNode`                                                      |         | No       | Replaces the default icon; `null` removes it.                                              |
| `onDismiss`    | `(() => void) \| undefined`                                      |         | No       | Adds a dismiss button that calls this. The Alert does not hide itself: you own that state. |
| `dismissLabel` | `string`                                                         |         | No       | The accessible name of the dismiss button. Default "Dismiss".                              |

## Accessibility

- Alerts use `role="alert"` or `role="status"` according to urgency; the icon is decorative and the text carries the meaning, so colour is never the only signal.
- The dismiss button is a real button with an accessible name, reachable and operable with Tab, Enter and Space.
- Skeletons are hidden from assistive technology; use `aria-busy` on the container.

| Key                | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `Tab`              | Moves focus to the dismiss button of an Alert that has one. |
| `Enter` or `Space` | Dismisses the Alert (calls onDismiss).                      |

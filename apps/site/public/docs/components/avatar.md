# Avatar

> A person or entity as an image with initials as the fallback, plus a group with a labelled overflow count. Built on Base UI.

Source: https://platform.azmara.io/docs/components/avatar

Group: Data display · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Avatar, AvatarGroup } from "@azmr/ui/avatar";
```

```tsx
import { Avatar, AvatarGroup } from "@azmr/ui/avatar";

const team = ["Aroha Ngata", "Mere Walker", "Hemi Te Rangi", "Tane Smith", "Rangi Bell"];

export default function AvatarBasic() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <Avatar name="Aroha Ngata" size="sm" />
        <Avatar name="Aroha Ngata" />
        <Avatar name="Aroha Ngata" size="lg" />
        <Avatar name="Aroha Ngata" size="xl" shape="square" />
      </div>

      {/* An image that cannot load falls back to the initials, still labelled. */}
      <Avatar src="/does-not-exist.png" name="Mere Walker" />

      <AvatarGroup max={3} aria-label="Project team">
        {team.map((person) => (
          <Avatar key={person} name={person} />
        ))}
      </AvatarGroup>
    </div>
  );
}
```

When `src` is missing, still loading, or fails (offline, a 404), the **initials of `name`** are shown instead, so an avatar never turns into a broken-image icon. `getInitials` is exported: the first character of the first two words, uppercased, counting whole characters so an emoji or a rare character is never cut in half. Pass `fallback` to show something else, and `delayMs` to avoid a flash of initials while a fast image loads.

## Naming

An avatar must say who it is, so the types require one of `name`, `alt` or `decorative`:

- `name` labels the avatar and supplies the initials. `alt` overrides the label ("Aroha, account owner").
- `decorative` hides it from assistive technology, for an avatar beside a name that already says who it is.

The avatar element carries the label; the image inside is `alt=""` so it is not announced twice.

## AvatarGroup

`AvatarGroup` overlaps its avatars and shows at most `max`, then a `+N` avatar labelled "N more" (`overflowLabel` to localise). It is a `role="group"`: give it an `aria-label` ("Project team").

## Props

| Prop            | Type                                        | Default | Required | Description                                               |
| --------------- | ------------------------------------------- | ------- | -------- | --------------------------------------------------------- |
| `max`           | `number`                                    |         | No       | Show at most this many avatars, then a `+N` for the rest. |
| `overflowLabel` | `((hidden: number) => string) \| undefined` |         | No       | The accessible name of the `+N` avatar. Default `N more`. |
| `children`      | `ReactNode`                                 |         | No       |                                                           |

## Accessibility

- `role="img"` with the name as its label, or `aria-hidden` when decorative.
- The overflow avatar says how many people are hidden.
- No keyboard interaction; put an avatar inside a button or link when it should be interactive, and give that control the name.

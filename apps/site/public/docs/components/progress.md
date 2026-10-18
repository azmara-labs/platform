# Progress

> A linear or circular progress indicator with a required name, a determinate and an indeterminate state, and tones that stay visible against the track.

Source: https://platform.azmara.io/docs/components/progress

Group: Feedback · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Progress } from "@azmr/ui/progress";
```

```tsx
import { Progress } from "@azmr/ui/progress";

export default function ProgressBasic() {
  return (
    <div className="flex max-w-md flex-col gap-5">
      <Progress value={40} showValue aria-label="Upload progress" />
      <Progress value={75} tone="success" size="lg" aria-label="Storage used" />
      <Progress value={90} tone="warning" aria-label="Quota" />
      <Progress value={100} tone="destructive" size="sm" aria-label="Disk full" />
      {/* value={null}: the amount is unknown. It pulses and stays partial, so it never looks done. */}
      <Progress value={null} aria-label="Preparing your export" />
    </div>
  );
}
```

`value` is the current amount in the range `min` to `max` (default 0 to 100), clamped to it. `value={null}` means the amount is **unknown**: the bar is partial and pulses, and carries no `aria-valuenow`. A value that is not a finite number is treated the same way rather than rendered as `NaN`.

## Circular

```tsx
import { Progress } from "@azmr/ui/progress";

export default function ProgressCircular() {
  return (
    <div className="flex items-center gap-6">
      <Progress variant="circular" size="sm" value={30} aria-label="Sync" />
      <Progress variant="circular" value={65} showValue tone="info" aria-label="Profile complete" />
      <Progress
        variant="circular"
        size="lg"
        value={90}
        showValue
        tone="success"
        aria-label="Tasks done"
      />
      <Progress variant="circular" value={null} aria-label="Loading" />
    </div>
  );
}
```

## Why it needs a name

A progress bar with no name is announced as just "progress bar". `aria-label` (or `aria-labelledby` pointing at a heading) is required by the types. The percentage is the default `aria-valuetext`; pass `valueText` for something better ("Step 3 of 10"). `showValue` prints the percentage as text, hidden from assistive technology because the bar already says it.

## Reduced motion and indeterminate

An indeterminate bar pulses. Under `prefers-reduced-motion` it **keeps pulsing**, because a frozen full-width bar would read as "done". It is also never full width, and the pulse is opacity, not movement.

## Tones are checked

`tone` is `default`, `success`, `warning`, `destructive` or `info`. The indicator colour must show up against both the track and the page (3:1 for non-text content), and the test suite checks it for every tone in light and dark. The `warning` tone uses the readable `--warning-text` colour, not the pale yellow surface colour, which would be far too faint on a light track.

## Props

| Prop        | Type                                                                          | Default | Required | Description                                                                                           |
| ----------- | ----------------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `value`     | `number \| null`                                                              |         | Yes      | The current value, or `null` when the amount is not known (indeterminate). Default range is 0 to 100. |
| `min`       | `number`                                                                      |         | No       |                                                                                                       |
| `max`       | `number`                                                                      |         | No       |                                                                                                       |
| `variant`   | `"linear" \| "circular" \| undefined`                                         |         | No       | `linear` (default) is a bar; `circular` is a ring.                                                    |
| `size`      | `"sm" \| "md" \| "lg" \| undefined`                                           |         | No       |                                                                                                       |
| `tone`      | `"success" \| "destructive" \| "info" \| "default" \| "warning" \| undefined` |         | No       |                                                                                                       |
| `showValue` | `boolean \| undefined`                                                        |         | No       | Show the percentage as text next to (linear) or inside (circular) the indicator.                      |
| `valueText` | `((value: number \| null) => string) \| undefined`                            |         | No       | The text a screen reader announces, instead of the default percentage.                                |
| `className` | `string`                                                                      |         | No       |                                                                                                       |

## Accessibility

- Native `role="progressbar"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax` (from Base UI), and a required accessible name.
- The circular ring is decorative (`aria-hidden`); the progressbar carries the meaning.
- No keyboard interaction: a progress bar is not focusable.

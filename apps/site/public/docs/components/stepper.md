# Stepper

> Shows where someone is in a fixed sequence of steps. A status display with each state said in text, horizontal or vertical. Server-safe.

Source: https://platform.azmara.io/docs/components/stepper

Group: Navigation · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Stepper } from "@azmr/ui/stepper";
```

```tsx
import { Stepper } from "@azmr/ui/stepper";

const steps = [
  { label: "Account", description: "Your details" },
  { label: "Plan", description: "Choose a plan" },
  { label: "Payment" },
  { label: "Confirm" },
];

export default function StepperBasic() {
  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={steps} current={1} label="Sign-up progress" />
      <div className="flex flex-wrap gap-12">
        <Stepper steps={steps} current={2} orientation="vertical" label="Vertical progress" />
        <Stepper
          steps={[
            { label: "Upload" },
            { label: "Validate", status: "error", description: "2 rows failed" },
            { label: "Import" },
          ]}
          current={1}
          orientation="vertical"
          label="Import progress"
        />
      </div>
    </div>
  );
}
```

```tsx
<Stepper
  current={1}
  steps={[{ label: "Account" }, { label: "Plan" }, { label: "Payment" }, { label: "Confirm" }]}
/>
```

`current` is the index (from 0) of the step in progress. Steps before it are **complete**, the one at `current` is **current**, and the rest are **upcoming**. Below `0` nothing has started; past the last step everything is done. Mark a step as failed with `status: "error"`, which does not change the others.

It is a **status display, not navigation**: steps are not links or buttons. If people can jump between steps, build the controls yourself (or use `Tabs`) and use the stepper to show progress.

## Orientation

`orientation` is `horizontal` (default) or `vertical`. Use vertical when steps carry descriptions or the space is narrow.

## Say it in text, not only colour

Each step's state is also written in text for screen readers ("Completed", "Current step", "Not started", "Error"), alongside the visible number or check mark. Translate those words with `statusLabels`. The current step is `aria-current="step"`. The check and error marks are decorative.

## Props

| Prop           | Type                                      | Default | Required | Description                                                                                                |
| -------------- | ----------------------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `steps`        | `readonly StepperStep[]`                  |         | Yes      |                                                                                                            |
| `current`      | `number`                                  |         | Yes      | The index (0-based) of the step in progress. Below 0 nothing has started; past the end everything is done. |
| `orientation`  | `"horizontal" \| "vertical" \| undefined` |         | No       |                                                                                                            |
| `label`        | `string`                                  |         | No       | The list's name. Default "Progress".                                                                       |
| `statusLabels` | `Partial<Record<StepStatus, string>>`     |         | No       | The words spoken for each state, for translation.                                                          |

## Accessibility

- An ordered list named "Progress" (rename it with `label`).
- `aria-current="step"` on the current step only.
- State is conveyed in text as well as colour and icon.
- Connectors between steps are decorative and hidden from assistive technology.

| Key   | Action                                                       |
| ----- | ------------------------------------------------------------ |
| `Tab` | Nothing in a stepper is focusable: it only reports progress. |

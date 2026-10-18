# Input

> A text input whose ref is the real input element, so react-hook-form works without a Controller.

Source: https://platform.azmara.io/docs/components/input

Group: Inputs · Status: stable · Added in @azmr/ui 0.2.0

## Usage

```tsx
import { Input } from "@azmr/ui/input";
```

```tsx
import { Input } from "@azmr/ui/input";

export default function InputBasic() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="demo-input-email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="demo-input-email"
        type="email"
        placeholder="aroha@example.co.nz"
        autoComplete="email"
      />
    </div>
  );
}
```

Always pair an input with a visible `<label htmlFor>` (or `aria-label` when the design has no label). `Input` does not add one for you, because the label belongs to the form layout.

## States

```tsx
import { Input } from "@azmr/ui/input";

export default function InputStates() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="demo-input-disabled" className="text-sm font-medium">
          Disabled
        </label>
        <Input id="demo-input-disabled" disabled defaultValue="Locked" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="demo-input-readonly" className="text-sm font-medium">
          Read only
        </label>
        <Input id="demo-input-readonly" readOnly defaultValue="Can focus, cannot edit" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="demo-input-invalid" className="text-sm font-medium">
          Invalid
        </label>
        <Input
          id="demo-input-invalid"
          aria-invalid="true"
          aria-describedby="demo-input-invalid-message"
          defaultValue="not-an-email"
        />
        <p id="demo-input-invalid-message" className="text-sm text-destructive">
          Enter a valid email address.
        </p>
      </div>
    </div>
  );
}
```

`aria-invalid="true"` styles the error state and is what assistive technology announces; point `aria-describedby` at the message so it is read with the field. A read-only input stays focusable and can be selected and copied, while a disabled one is skipped by Tab.

## With react-hook-form

The `ref` is the real `<input>`, so `register()` works directly:

```tsx
import { useForm } from "react-hook-form";
import { Input } from "@azmr/ui/input";

function EmailField() {
  const { register } = useForm<{ email: string }>();
  return <Input type="email" {...register("email")} />;
}
```

Native `onChange` and a typed `onValueChange(value)` both fire.

## Props

| Prop            | Type                                                                             | Default | Required | Description                                                   |
| --------------- | -------------------------------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------- |
| `className`     | `string`                                                                         |         | No       |                                                               |
| `value`         | `string \| number \| readonly string[] \| undefined`                             |         | No       | The value of the input. Use when controlled.                  |
| `defaultValue`  | `string \| number \| readonly string[] \| undefined`                             |         | No       | The default value of the input. Use when uncontrolled.        |
| `onValueChange` | `((value: string, eventDetails: Input.ChangeEventDetails) => void) \| undefined` |         | No       | Callback fired when the `value` changes. Use when controlled. |

All native `<input>` attributes pass through. `className` is merged last, so it can override the defaults, and `onValueChange` gives you the new value directly instead of `event.target.value`.

Height and horizontal padding follow the density tokens, so the input lines up with `Button` at every density.

## Accessibility

- A real `<input>`: name, role and value come from the platform.
- The focus ring is full strength (WCAG 2.2 focus appearance), never faded.
- Invalid state is exposed through `aria-invalid`, not colour alone: pair it with a text message.

| Key              | Action                                                              |
| ---------------- | ------------------------------------------------------------------- |
| `Tab`            | Moves focus into and out of the field. Disabled inputs are skipped. |
| `Shift` or `Tab` | Moves focus to the previous control.                                |
| `Esc`            | Not captured, so a parent dialog can use it to close.               |

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

import { Field } from "@azmr/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@azmr/ui/input-group";

export default function InputGroupMoney() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Hourly rate" description="Excluding GST.">
        <InputGroup>
          <InputGroupAddon>NZ$</InputGroupAddon>
          <InputGroupInput name="rate" inputMode="decimal" placeholder="0.00" />
          <InputGroupAddon>per hour</InputGroupAddon>
        </InputGroup>
      </Field>
      <Field label="Parcel weight">
        <InputGroup>
          <InputGroupInput name="weight" inputMode="decimal" />
          <InputGroupAddon>kg</InputGroupAddon>
        </InputGroup>
      </Field>
      <Field label="Website">
        <InputGroup>
          <InputGroupAddon>https://</InputGroupAddon>
          <InputGroupInput name="website" placeholder="example.co.nz" />
        </InputGroup>
      </Field>
    </div>
  );
}

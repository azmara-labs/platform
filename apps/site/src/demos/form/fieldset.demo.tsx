import { Field } from "@azmr/ui/field";
import { Fieldset } from "@azmr/ui/form";
import { Input } from "@azmr/ui/input";

export default function FormFieldset() {
  return (
    <Fieldset
      legend="Postal address"
      description="Where we send printed statements."
      className="w-full max-w-md"
    >
      <Field label="Street address">
        <Input name="street" autoComplete="street-address" />
      </Field>
      <Field label="Suburb">
        <Input name="suburb" autoComplete="address-level3" />
      </Field>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <Field label="Town or city">
          <Input name="city" autoComplete="address-level2" />
        </Field>
        <Field label="Postcode">
          <Input name="postcode" autoComplete="postal-code" inputMode="numeric" />
        </Field>
      </div>
    </Fieldset>
  );
}

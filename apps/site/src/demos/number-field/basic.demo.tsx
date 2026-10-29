import { Field } from "@azmr/ui/field";
import { NumberField } from "@azmr/ui/number-field";

export default function NumberFieldBasic() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Guests" description="Up to 12 per booking.">
        <NumberField name="guests" stepper min={1} max={12} defaultValue={2} />
      </Field>
      <Field label="Floor area" description="Square metres, to one decimal place.">
        <NumberField name="area" min={0} decimalScale={1} defaultValue={1250.5} />
      </Field>
      <Field label="Discount">
        <NumberField
          name="discount"
          min={0}
          max={1}
          step={0.05}
          format={{ style: "percent" }}
          defaultValue={0.1}
        />
      </Field>
    </div>
  );
}

import { Field } from "@azmr/ui/field";
import { Input, Textarea } from "@azmr/ui/input";

export default function FieldBasic() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Business name" required>
        <Input autoComplete="organization" />
      </Field>
      <Field label="GST number" description="Nine digits, as on your IRD letter.">
        <Input inputMode="numeric" placeholder="123-456-789" />
      </Field>
      <Field label="Notes" description="Printed at the bottom of every invoice.">
        <Textarea placeholder="Thanks for your business." />
      </Field>
    </div>
  );
}

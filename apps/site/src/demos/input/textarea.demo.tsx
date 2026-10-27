import { Field } from "@azmr/ui/field";
import { Textarea } from "@azmr/ui/input";

export default function InputTextarea() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Message">
        <Textarea placeholder="Drag the corner to resize." />
      </Field>
      <Field label="Grows as you type" description="With autoResize, no scrollbar appears.">
        <Textarea autoResize rows={2} />
      </Field>
    </div>
  );
}

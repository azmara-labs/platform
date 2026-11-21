"use client";

import { Button } from "@azmr/ui/button";
import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "@azmr/ui/choice";
import { Form, FormField } from "@azmr/ui/rhf";
import { zodResolver } from "@azmr/ui/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["starter", "team"], "Pick a plan"),
  modules: z
    .array(z.enum(["invoices", "quotations", "reports"]))
    .min(1, "Pick at least one module"),
  notify: z.boolean(),
  terms: z.boolean().refine((accepted) => accepted, "You must accept the terms"),
});

type Input = z.input<typeof schema>;

export default function ChoiceForm() {
  const [saved, setSaved] = useState<unknown>();
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    // No default for `plan`: a field with no value yet shows nothing chosen.
    defaultValues: { modules: [], notify: false, terms: false },
    shouldFocusError: false,
  });
  return (
    <Form form={form} onSubmit={setSaved} className="flex w-full max-w-md flex-col gap-6">
      <FormField name="plan">
        <RadioGroup
          label="Plan"
          options={[
            { value: "starter", label: "Starter" },
            { value: "team", label: "Team" },
          ]}
        />
      </FormField>
      <FormField name="modules">
        <CheckboxGroup
          label="Modules"
          options={[
            { value: "invoices", label: "Invoices" },
            { value: "quotations", label: "Quotations" },
            { value: "reports", label: "Reports" },
          ]}
        />
      </FormField>
      <FormField name="notify">
        <Switch label="Email me about new invoices" />
      </FormField>
      <FormField name="terms">
        <Checkbox label="I accept the terms" />
      </FormField>
      <Button type="submit">Save</Button>
      {saved ? (
        <pre className="rounded-md bg-muted p-3 text-xs">{JSON.stringify(saved, null, 2)}</pre>
      ) : null}
    </Form>
  );
}

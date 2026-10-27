"use client";

import { Button } from "@azmr/ui/button";
import { Field } from "@azmr/ui/field";
import { ErrorSummary, Fieldset, FormSection } from "@azmr/ui/form";
import { Input, Textarea } from "@azmr/ui/input";
import { Separator } from "@azmr/ui/layout";
import { type FormEvent, useState } from "react";

type Name = "business" | "gst" | "email" | "phone" | "city" | "postcode" | "reminders";
type Errors = Partial<Record<Name, string>>;

// Validate on submit, in the order the fields appear, so the summary lists them top to bottom.
function validate(data: FormData): Errors {
  const value = (name: string) => String(data.get(name) ?? "").trim();
  const errors: Errors = {};
  if (value("business") === "") errors.business = "Enter your business name";
  if (value("gst") && !/^\d{3}-?\d{3}-?\d{3}$/.test(value("gst"))) {
    errors.gst = "Enter a GST number with 9 digits, like 123-456-789";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) {
    errors.email = "Enter an email address like accounts@example.co.nz";
  }
  if (value("phone") && !/^\+?[\d\s-]{7,}$/.test(value("phone"))) {
    errors.phone = "Enter a phone number, like 09 123 4567";
  }
  if (value("city") === "") errors.city = "Enter a town or city";
  if (!/^\d{4}$/.test(value("postcode"))) errors.postcode = "Enter a 4-digit postcode";
  if (data.getAll("reminders").length === 0) {
    errors.reminders = "Choose at least one way to send reminders";
  }
  return errors;
}

const REMINDERS = [
  { value: "email", label: "Email", checked: true },
  { value: "sms", label: "Text message", checked: false },
  { value: "post", label: "Post", checked: false },
];

export default function FormSettings() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(new FormData(event.currentTarget));
    setErrors(found);
    setSubmitCount((count) => count + 1);
    setSaved(Object.keys(found).length === 0);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-8">
      <ErrorSummary errors={errors} submitCount={submitCount} />

      <FormSection
        title="Business details"
        description="Printed on every quote and invoice."
        layout="aside"
        columns={2}
      >
        <Field label="Business name" required error={errors.business} className="@lg:col-span-2">
          <Input name="business" autoComplete="organization" />
        </Field>
        <Field
          label="GST number"
          description="Leave blank if you aren't registered."
          error={errors.gst}
        >
          <Input name="gst" inputMode="numeric" placeholder="123-456-789" />
        </Field>
        <Field label="NZBN" description="Optional.">
          <Input name="nzbn" inputMode="numeric" />
        </Field>
      </FormSection>

      <Separator />

      <FormSection
        title="Contact"
        description="Customers reply to this address."
        layout="aside"
        columns={2}
      >
        <Field label="Accounts email" required error={errors.email}>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Fieldset legend="Postal address" className="@lg:col-span-2">
          <Field label="Street address">
            <Input name="street" autoComplete="street-address" />
          </Field>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
            <Field label="Town or city" required error={errors.city}>
              <Input name="city" autoComplete="address-level2" />
            </Field>
            <Field label="Postcode" required error={errors.postcode}>
              <Input name="postcode" autoComplete="postal-code" inputMode="numeric" />
            </Field>
          </div>
        </Fieldset>
      </FormSection>

      <Separator />

      <FormSection
        title="Payment reminders"
        description="Sent when an invoice is 7 days overdue."
        layout="aside"
      >
        <Fieldset
          legend="Send reminders by"
          description="Choose all that apply."
          error={errors.reminders}
        >
          <div className="flex flex-col gap-2">
            {REMINDERS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="reminders"
                  value={option.value}
                  defaultChecked={option.checked}
                  className="size-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </Fieldset>
        <Field label="Reminder note" description="Added to the bottom of each reminder.">
          <Textarea name="note" placeholder="Kia ora, a friendly reminder that…" />
        </Field>
      </FormSection>

      <div className="flex items-center gap-3">
        <Button type="submit">Save settings</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {saved ? "Settings saved." : ""}
        </p>
      </div>
    </form>
  );
}

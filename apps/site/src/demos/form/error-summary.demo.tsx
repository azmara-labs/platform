"use client";

import { Button } from "@azmr/ui/button";
import { Field } from "@azmr/ui/field";
import { ErrorSummary } from "@azmr/ui/form";
import { Input } from "@azmr/ui/input";
import { type FormEvent, useState } from "react";

type Errors = Partial<Record<"name" | "email", string>>;

function validate(form: HTMLFormElement): Errors {
  const data = new FormData(form);
  const errors: Errors = {};
  if (String(data.get("name")).trim() === "") errors.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email")))) {
    errors.email = "Enter an email address like aroha@example.co.nz";
  }
  return errors;
}

export default function FormErrorSummary() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(event.currentTarget);
    setErrors(found);
    setSubmitCount((count) => count + 1);
    setSent(Object.keys(found).length === 0);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <ErrorSummary errors={errors} submitCount={submitCount} />
      <Field label="Full name" required error={errors.name}>
        <Input name="name" autoComplete="name" />
      </Field>
      <Field label="Email" required error={errors.email}>
        <Input name="email" type="email" autoComplete="email" />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit">Continue</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {sent ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}

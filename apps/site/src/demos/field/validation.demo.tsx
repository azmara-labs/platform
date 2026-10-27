"use client";

import { Button } from "@azmr/ui/button";
import { Field } from "@azmr/ui/field";
import { Input } from "@azmr/ui/input";
import { type FormEvent, useState } from "react";

function emailError(value: string): string | undefined {
  if (value.trim() === "") return "Enter your email address";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Enter an email address like name@example.co.nz";
  return undefined;
}

export default function FieldValidation() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = emailError(email);
    setError(next);
    setSent(next === undefined);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Email" description="We send receipts here." required error={error}>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onValueChange={(value) => {
            setEmail(value);
            setSent(false);
            if (error) setError(emailError(value));
          }}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit">Save</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {sent ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}

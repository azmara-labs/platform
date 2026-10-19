"use client";

import { Button } from "@azmr/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@azmr/ui/display";
import { Input } from "@azmr/ui/input";
import { Separator } from "@azmr/ui/layout";
import { toast } from "@azmr/ui/toast";
import { Toggle } from "@azmr/ui/toggle";
import { type FormEvent, useId, useRef, useState } from "react";

type Field = "name" | "email" | "website";
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate on submit, not on every keystroke: a message that appears while someone is still typing
// is noise. Each rule returns the message that would fix the problem.
function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!EMAIL.test(values.email)) errors.email = "Enter an email address like aroha@example.co.nz.";
  if (values.website && !/^https?:\/\/\S+\.\S+$/.test(values.website)) {
    errors.website = "Start the address with https://.";
  }
  return errors;
}

const NOTIFICATIONS = [
  { id: "product", label: "Product updates", on: true },
  { id: "billing", label: "Billing and invoices", on: true },
  { id: "tips", label: "Tips and offers", on: false },
];

export default function SettingsPage() {
  const id = useId();
  const [values, setValues] = useState<Record<Field, string>>({
    name: "Aroha Ngata",
    email: "aroha@example.co.nz",
    website: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  const failed = Object.keys(errors) as Field[];

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = (["name", "email", "website"] as Field[]).find((field) => found[field]);
    // Move focus to the first problem, so a keyboard or screen reader user lands on it.
    if (first) return refs.current[first]?.focus();

    setSaving(true);
    toast
      .promise(new Promise((resolve) => setTimeout(resolve, 900)), {
        loading: "Saving…",
        success: "Settings saved",
        error: "Could not save",
      })
      .finally(() => setSaving(false));
  }

  function field(name: Field, label: string, props: { type?: string; autoComplete?: string }) {
    const message = errors[name];
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-${name}`} className="text-sm font-medium">
          {label}
        </label>
        <Input
          {...props}
          id={`${id}-${name}`}
          ref={(node) => {
            refs.current[name] = node;
          }}
          value={values[name]}
          onChange={(event) => setValues((v) => ({ ...v, [name]: event.target.value }))}
          aria-invalid={message ? "true" : undefined}
          aria-describedby={message ? `${id}-${name}-error` : undefined}
        />
        {message && (
          <p id={`${id}-${name}-error`} className="text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Account settings" className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Account</CardTitle>
          <CardDescription>How we address you and where we send things.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {failed.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>
                {failed.length === 1
                  ? "One thing needs fixing"
                  : `${failed.length} things need fixing`}
              </AlertTitle>
              <AlertDescription>Each message is next to its field.</AlertDescription>
            </Alert>
          )}
          {field("name", "Full name", { autoComplete: "name" })}
          {field("email", "Email", { type: "email", autoComplete: "email" })}
          {field("website", "Website (optional)", { type: "url", autoComplete: "url" })}

          <Separator />

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 text-sm font-medium">Email me about</legend>
            {NOTIFICATIONS.map((item) => (
              <Toggle
                key={item.id}
                variant="outline"
                defaultPressed={item.on}
                className="justify-start"
              >
                {item.label}
              </Toggle>
            ))}
          </fieldset>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" loading={saving} loadingText="Saving">
            Save changes
          </Button>
          <Button type="reset" variant="ghost" onClick={() => setErrors({})}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

"use client";

import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import { type FormEvent, useId, useRef, useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FormValidation() {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL.test(email)) {
      setSent(false);
      setError("Enter an email address like aroha@example.co.nz.");
      // Put the cursor on the problem, so nobody has to hunt for it.
      input.current?.focus();
      return;
    }
    setError(null);
    setSent(true);
  }

  return (
    // noValidate turns off the browser's own bubbles, so the message below is the only one.
    <form
      onSubmit={submit}
      noValidate
      aria-label="Subscribe"
      className="flex max-w-sm flex-col gap-3"
    >
      <label htmlFor={`${id}-email`} className="text-sm font-medium">
        Email
      </label>
      <Input
        id={`${id}-email`}
        ref={input}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        // The red border is not enough on its own: aria-invalid says it, the message explains it,
        // and aria-describedby ties the two together for a screen reader.
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="self-start">
        Subscribe
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {sent ? `Subscribed ${email}.` : ""}
      </p>
    </form>
  );
}

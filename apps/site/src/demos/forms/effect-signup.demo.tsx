"use client";

import { Button } from "@azmr/ui/button";
import { effectSchemaResolver } from "@azmr/ui/effect";
import { Input } from "@azmr/ui/input";
import { Form, FormErrorSummary, FormField } from "@azmr/ui/rhf";
import { Effect, Schema, SchemaGetter } from "effect";
import { useState } from "react";
import { useForm } from "react-hook-form";

// Pretend server check: these web addresses are already in use.
const TAKEN = new Set(["northline", "kiwi-plumbing"]);

const text = (message: string) =>
  Schema.String.pipe(Schema.check(Schema.isMinLength(1, { message })));

// A pattern check, then an effectful one: the server is only asked about a well-formed address.
const Slug = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[a-z0-9-]{3,30}$/, {
      message: "Use 3 to 30 lowercase letters, numbers or hyphens",
    }),
  ),
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.checkEffect((slug: string) =>
      Effect.promise(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return TAKEN.has(slug) ? "That web address is taken; try another" : undefined;
      }),
    ),
    encode: SchemaGetter.passthrough(),
  }),
);

const schema = Schema.Struct({
  business: text("Enter your business name"),
  slug: Slug,
  email: Schema.String.pipe(
    Schema.check(
      Schema.isPattern(/^[^@\s]+@[^@\s]+$/, {
        message: "Enter an email address like aroha@example.co.nz",
      }),
    ),
  ),
  // Text first, then a finite number: NumberFromString alone would turn a blank into 0.
  seats: text("Enter the number of seats").pipe(
    Schema.decodeTo(
      Schema.NumberFromString.pipe(
        Schema.check(
          Schema.isFinite({ message: "Enter a number" }),
          Schema.isGreaterThanOrEqualTo(1, { message: "At least 1 seat" }),
        ),
      ),
    ),
  ),
});

export default function FormsEffectSignup() {
  const [created, setCreated] = useState<typeof schema.Type>();
  const form = useForm<typeof schema.Encoded, unknown, typeof schema.Type>({
    resolver: effectSchemaResolver(schema),
    defaultValues: { business: "", slug: "", email: "", seats: "" },
    shouldFocusError: false,
  });

  return (
    <Form form={form} onSubmit={setCreated} className="flex w-full max-w-lg flex-col gap-6">
      <FormErrorSummary />
      <FormField name="business" label="Business name" required>
        <Input autoComplete="organization" />
      </FormField>
      <FormField
        name="slug"
        label="Web address"
        description="Try northline to see the effectful check."
        required
      >
        <Input autoCapitalize="none" spellCheck={false} />
      </FormField>
      <FormField name="email" label="Email" required>
        <Input type="email" autoComplete="email" />
      </FormField>
      <FormField name="seats" label="Seats" required>
        <Input inputMode="numeric" />
      </FormField>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={form.formState.isSubmitting} loadingText="Checking…">
          Create account
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {created ? `Created ${created.business} with ${created.seats} seats.` : ""}
        </p>
      </div>
    </Form>
  );
}

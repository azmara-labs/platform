"use client";

import { Button } from "@azmr/ui/button";
import { FormSection } from "@azmr/ui/form";
import { Input } from "@azmr/ui/input";
import { MoneyField, numberOrNull } from "@azmr/ui/number-field";
import { PasswordInput, passwordRequirements } from "@azmr/ui/password-input";
import { Form, FormErrorSummary, FormField } from "@azmr/ui/rhf";
import { zodResolver } from "@azmr/ui/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Pretend server check: these web addresses are already in use.
const TAKEN = new Set(["northline", "kiwi-plumbing"]);
const isFree = async (slug: string) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return !TAKEN.has(slug);
};

const schema = z.object({
  business: z.string().trim().min(2, "Enter your business name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,30}$/, "Use 3 to 30 letters, numbers or hyphens")
    .refine(isFree, "That web address is taken; try another"),
  email: z.email("Enter an email address like aroha@example.co.nz"),
  password: z.string().min(12, "Use at least 12 characters"),
  budget: z
    .number("Enter a monthly budget")
    .min(0, "Enter an amount of $0 or more")
    .max(100_000, "Enter an amount up to $100,000"),
});

type SignupInput = z.input<typeof schema>;
type SignupOutput = z.output<typeof schema>;

export default function FormsSignup() {
  const [created, setCreated] = useState<SignupOutput>();
  const form = useForm<SignupInput, unknown, SignupOutput>({
    resolver: zodResolver(schema),
    defaultValues: { business: "", slug: "", email: "", password: "" },
    shouldFocusError: false,
  });

  return (
    <Form form={form} onSubmit={setCreated} className="flex w-full max-w-lg flex-col gap-6">
      <FormErrorSummary />
      <FormSection title="Your business">
        <FormField name="business" label="Business name" required>
          <Input autoComplete="organization" />
        </FormField>
        <FormField
          name="slug"
          label="Web address"
          description="Try northline to see the async check."
          required
        >
          <Input autoCapitalize="none" spellCheck={false} />
        </FormField>
        <FormField
          name="budget"
          label="Monthly budget"
          required
          rules={{ setValueAs: numberOrNull }}
        >
          <MoneyField min={0} />
        </FormField>
      </FormSection>
      <FormSection title="Your account">
        <FormField name="email" label="Email" required>
          <Input type="email" autoComplete="email" />
        </FormField>
        <FormField name="password" label="Password" required>
          <PasswordInput
            autoComplete="new-password"
            requirements={[passwordRequirements.minLength(12)]}
          />
        </FormField>
      </FormSection>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={form.formState.isSubmitting} loadingText="Checking…">
          Create account
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {created ? `Created ${created.business} at ${created.slug}.azmara.io.` : ""}
        </p>
      </div>
    </Form>
  );
}

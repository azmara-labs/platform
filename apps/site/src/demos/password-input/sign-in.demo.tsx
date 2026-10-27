"use client";

import { Field } from "@azmr/ui/field";
import { Input } from "@azmr/ui/input";
import { PasswordInput } from "@azmr/ui/password-input";

export default function PasswordInputSignIn() {
  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" />
      </Field>
      <Field label="Password">
        <PasswordInput name="password" autoComplete="current-password" />
      </Field>
    </form>
  );
}

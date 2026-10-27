import { Field } from "@azmr/ui/field";
import { PasswordInput, passwordRequirements } from "@azmr/ui/password-input";

// Length is the rule that matters (NCSC, NIST SP 800-63B); the others are shown as examples.
const RULES = [
  passwordRequirements.minLength(12),
  passwordRequirements.number(),
  passwordRequirements.symbol(),
];

export default function PasswordInputNewPassword() {
  return (
    <div className="w-full max-w-sm">
      <Field label="New password" description="Try a few unrelated words.">
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          strength
          requirements={RULES}
        />
      </Field>
    </div>
  );
}

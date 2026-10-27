import { FieldDescription, FieldLabel, FieldRoot } from "@azmr/ui/field";
import { Input } from "@azmr/ui/input";

export default function FieldParts() {
  return (
    <div className="w-full max-w-sm">
      <FieldRoot>
        <div className="flex items-baseline justify-between">
          <FieldLabel required>Password</FieldLabel>
          <a
            href="#forgot-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <Input type="password" autoComplete="current-password" />
        <FieldDescription>At least 12 characters.</FieldDescription>
      </FieldRoot>
    </div>
  );
}

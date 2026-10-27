// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Field } from "../field/field.js";
import { PasswordInput, passwordRequirements } from "./index.js";

describe("PasswordInput server-renders without browser globals", () => {
  it("renders the input, toggle, meter and checklist", () => {
    const html = expectServerSafe(
      <Field label="New password" required>
        <PasswordInput
          autoComplete="new-password"
          strength
          requirements={[passwordRequirements.minLength(12)]}
          defaultValue="correct horse battery staple"
        />
      </Field>,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Very strong");
    expect(html).toContain("At least 12 characters");
  });
});

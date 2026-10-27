// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Field } from "../field/field.js";
import { Input } from "../input/input.js";
import { ErrorSummary, Fieldset, FormSection } from "./index.js";

describe("Form layout server-renders without browser globals", () => {
  it("renders a section, a fieldset and an error summary", () => {
    const html = expectServerSafe(
      <form>
        <ErrorSummary errors={{ email: "Enter an email address" }} />
        <FormSection title="Contact" columns={2}>
          <Fieldset legend="Email" description="Work address" error="Check the address">
            <Field label="Email">
              <Input name="email" />
            </Field>
          </Fieldset>
        </FormSection>
      </form>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="#email"');
    expect(html).toContain("<fieldset");
    expect(html).toContain("<section");
    expect(html).toContain("<h2");
    expect(html).toContain("Check the address");
  });
});

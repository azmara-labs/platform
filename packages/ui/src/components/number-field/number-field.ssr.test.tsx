// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Field } from "../field/field.js";
import { MoneyField, NumberField } from "./index.js";

describe("NumberField and MoneyField server-render without browser globals", () => {
  it("renders formatted values, the hidden form input and the stepper", () => {
    const html = expectServerSafe(
      <Field label="Amount" required>
        <MoneyField name="amount" defaultValue={1234.5} />
      </Field>,
    );
    expect(html).toContain("$1,234.50");
    expect(html).toContain('name="amount"');
    expect(html).toContain('aria-required="true"');
    const stepper = expectServerSafe(<NumberField aria-label="Guests" stepper defaultValue={2} />);
    expect(stepper).toContain('aria-label="Increase"');
    expect(stepper).toContain('aria-label="Decrease"');
  });
});

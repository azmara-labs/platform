// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Input } from "../input/input.js";
import { Textarea } from "../input/textarea.js";
import { Field } from "./field.js";

describe("Field and Textarea server-render without browser globals", () => {
  it("renders a labelled, invalid, required field", () => {
    const html = expectServerSafe(
      <Field label="Email" description="Work address" required error="Enter an email address">
        <Input />
      </Field>,
    );
    expect(html).toContain("<label");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Enter an email address");
  });

  it("renders a textarea", () => {
    const html = expectServerSafe(
      <Field label="Notes">
        <Textarea defaultValue="Paid" />
      </Field>,
    );
    expect(html).toContain("<textarea");
    expect(html).toContain("Paid");
  });
});

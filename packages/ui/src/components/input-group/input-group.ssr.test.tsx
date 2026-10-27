// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Field } from "../field/field.js";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./index.js";

describe("InputGroup server-renders without browser globals", () => {
  it("renders addons, the input and a button", () => {
    const html = expectServerSafe(
      <Field label="Price" required>
        <InputGroup>
          <InputGroupAddon>NZ$</InputGroupAddon>
          <InputGroupInput name="price" inputMode="decimal" />
          <InputGroupButton>Max</InputGroupButton>
        </InputGroup>
      </Field>,
    );
    expect(html).toContain('data-slot="input-group"');
    expect(html).toContain("NZ$");
    expect(html).toContain('name="price"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('type="button"');
  });
});

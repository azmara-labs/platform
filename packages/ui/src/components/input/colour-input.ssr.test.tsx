// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Field } from "../field/field.js";
import { ColourInput } from "./colour-input.js";

describe("ColourInput server-renders without browser globals", () => {
  it("renders both controls and the default value", () => {
    const html = expectServerSafe(
      <Field label="Brand colour">
        <ColourInput defaultValue="#1F7A5C" />
      </Field>,
    );
    expect(html).toContain('type="color"');
    expect(html).toContain('type="text"');
    expect(html).toContain("#1F7A5C");
    expect(html).toContain("#1f7a5c");
  });
});

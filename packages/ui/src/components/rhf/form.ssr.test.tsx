// @vitest-environment node
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Input } from "../input/input.js";
import { Form, FormErrorSummary, FormField } from "./index.js";

function Profile() {
  const form = useForm({ defaultValues: { name: "Aroha" } });
  return (
    <Form form={form} onSubmit={() => {}}>
      <FormErrorSummary />
      <FormField name="name" label="Name" rules={{ required: "Enter your name" }}>
        <Input />
      </FormField>
    </Form>
  );
}

describe("Form server-renders without browser globals", () => {
  it("renders a noValidate form with a registered, labelled, required field", () => {
    const html = expectServerSafe(<Profile />);
    expect(html).toContain("<form");
    expect(html).toContain("noValidate");
    expect(html).toContain('name="name"');
    expect(html).toContain('aria-required="true"');
  });
});

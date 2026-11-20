import { Schema } from "effect";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Input } from "../input/input.js";
import { Form, FormErrorSummary, FormField, FormFieldArray } from "../rhf/index.js";
import { zodResolver } from "../zod/resolver.js";
import { effectSchemaResolver } from "./resolver.js";

// The same form, built twice: once with zodResolver and once with effectSchemaResolver, over
// schemas that carry identical messages. Whatever a user would see (each field's error, the error
// summary, where focus goes, the value that reaches onSubmit) has to be the same, except where a
// test below says it differs and why.

type Values = {
  name: string;
  email: string;
  nickname?: string;
  note: string | null;
  qty: string;
  tries?: string;
  confirm: string;
  address: { city: string };
  tags: { label: string }[];
};

const EMAIL = /^[^@\s]+@[^@\s]+$/;
const NOT_ALLOWED = "That name is not allowed";

const zodForm = z
  .object({
    name: z.string().min(1, "Enter a name"),
    email: z.string().regex(EMAIL, "Enter an email address"),
    nickname: z.string().optional(),
    note: z.string().nullable(),
    qty: z.string().min(1, "Enter a quantity").transform(Number),
    tries: z.number().optional(),
    confirm: z.string(),
    address: z.object({ city: z.string().min(1, "Enter a city") }),
    tags: z.array(z.object({ label: z.string().min(1, "Enter a label") })),
  })
  .refine((v) => v.confirm === v.name, {
    path: ["confirm"],
    message: "Confirm must match the name",
  })
  .refine((v) => v.name !== "Forbidden", { message: NOT_ALLOWED });

const min1 = (message: string) =>
  Schema.String.pipe(Schema.check(Schema.isMinLength(1, { message })));

const effectForm = Schema.Struct({
  name: min1("Enter a name"),
  email: Schema.String.pipe(
    Schema.check(Schema.isPattern(EMAIL, { message: "Enter an email address" })),
  ),
  nickname: Schema.optional(Schema.String),
  note: Schema.NullOr(Schema.String),
  qty: min1("Enter a quantity").pipe(
    Schema.decodeTo(Schema.NumberFromString.pipe(Schema.check(Schema.isFinite()))),
  ),
  tries: Schema.optional(Schema.Number),
  confirm: Schema.String,
  address: Schema.Struct({ city: min1("Enter a city") }),
  tags: Schema.Array(Schema.Struct({ label: min1("Enter a label") })),
})
  .check(
    Schema.makeFilter((v) =>
      v.confirm === v.name
        ? undefined
        : { path: ["confirm"], issue: "Confirm must match the name" },
    ),
  )
  .check(Schema.makeFilter((v) => (v.name !== "Forbidden" ? undefined : NOT_ALLOWED)));

const resolvers = {
  zod: () => zodResolver(zodForm as never),
  effect: () => effectSchemaResolver(effectForm as never),
} as const;
type Kind = keyof typeof resolvers;

/** A cleared "tries" is no value at all; anything else is the number typed. */
const triesOrUndefined = (value: unknown) => (value === "" ? undefined : Number(value));

function Parity({
  kind,
  defaults,
  onSave,
}: {
  kind: Kind;
  defaults: Values;
  onSave: (values: unknown) => void;
}) {
  const form = useForm<Values>({
    resolver: resolvers[kind]() as never,
    defaultValues: defaults,
    shouldFocusError: false,
  });
  return (
    <Form form={form} onSubmit={onSave as never}>
      <FormErrorSummary />
      <FormField name="name" label="Name">
        <Input />
      </FormField>
      <FormField name="email" label="Email">
        <Input />
      </FormField>
      <FormField name="nickname" label="Nickname">
        <Input />
      </FormField>
      <FormField name="note" label="Note">
        <Input />
      </FormField>
      <FormField name="qty" label="Quantity">
        <Input />
      </FormField>
      <FormField name="tries" label="Tries" rules={{ setValueAs: triesOrUndefined }}>
        <Input />
      </FormField>
      <FormField name="confirm" label="Confirm name">
        <Input />
      </FormField>
      <FormField name="address.city" label="City">
        <Input />
      </FormField>
      <FormFieldArray<Values, "tags">
        name="tags"
        legend="Tags"
        itemLabel={(index) => `Tag ${index + 1}`}
        newItem={() => ({ label: "" })}
      >
        {(_, row) => (
          <FormField name={row.name("label")} label={`Label ${row.index + 1}`}>
            <Input />
          </FormField>
        )}
      </FormFieldArray>
      <Button type="submit">Save</Button>
    </Form>
  );
}

const valid: Values = {
  name: "Aroha",
  email: "aroha@example.co.nz",
  nickname: "",
  note: "",
  qty: "4",
  tries: "",
  confirm: "Aroha",
  address: { city: "Hamilton" },
  tags: [{ label: "vip" }],
};

const WAIT = { timeout: 5000 };

/** What a user sees after submitting: the summary, each field's own error, and what was saved. */
async function submitAndRead(kind: Kind, defaults: Values) {
  const onSave = vi.fn();
  const user = setupUser({ delay: null });
  const { container } = renderUi(<Parity kind={kind} defaults={defaults} onSave={onSave} />);
  await user.click(container.querySelector("button[type=submit]") as HTMLElement);
  const summary = () => container.querySelector('[role="alert"]') as HTMLElement | null;
  if (summary() === null && onSave.mock.calls.length === 0) {
    await vi.waitFor(
      () => expect(summary() !== null || onSave.mock.calls.length > 0).toBe(true),
      WAIT,
    );
  }
  const fieldErrors: Record<string, string> = {};
  for (const input of Array.from(container.querySelectorAll("input"))) {
    const id = input.getAttribute("aria-errormessage");
    const text = id ? document.getElementById(id)?.textContent : undefined;
    if (text) fieldErrors[input.name] = text;
  }
  return {
    summary: Array.from(summary()?.querySelectorAll("a") ?? []).map((a) => a.textContent),
    summaryText: summary()?.textContent ?? "",
    fieldErrors,
    focusOnSummary: summary() !== null && document.activeElement === summary(),
    saved: onSave.mock.calls[0]?.[0],
  };
}

const both = async (defaults: Values) => ({
  zod: await submitAndRead("zod", defaults),
  effect: await submitAndRead("effect", defaults),
});

describe("the Effect and Zod form adapters agree", () => {
  it("on a flat form submitted empty: the same errors, the same summary, the same focus", async () => {
    const { zod, effect } = await both({
      ...valid,
      name: "",
      email: "",
      qty: "",
      confirm: "",
      address: { city: "" },
    });
    expect(effect.fieldErrors).toEqual(zod.fieldErrors);
    expect(effect.summary).toEqual(zod.summary);
    expect(effect.focusOnSummary).toBe(zod.focusOnSummary);
    expect(zod.summary).toContain("Enter a name");
    expect(zod.focusOnSummary).toBe(true);
  });

  it("on array rows: errors land on rows 1 and 3, not row 2", async () => {
    const { zod, effect } = await both({
      ...valid,
      tags: [{ label: "" }, { label: "ok" }, { label: "" }],
    });
    expect(effect.fieldErrors).toEqual(zod.fieldErrors);
    expect(effect.summary).toEqual(zod.summary);
    expect(Object.keys(zod.fieldErrors).sort()).toEqual(["tags.0.label", "tags.2.label"]);
  });

  it("on a nested object: the error lands on address.city", async () => {
    const { zod, effect } = await both({ ...valid, address: { city: "" } });
    expect(effect.fieldErrors).toEqual(zod.fieldErrors);
    expect(effect.summary).toEqual(zod.summary);
    expect(Object.keys(zod.fieldErrors)).toEqual(["address.city"]);
  });

  it("on optional and nullable fields left blank: no error, and the same value is saved", async () => {
    const { zod, effect } = await both(valid);
    expect(zod.summary).toEqual([]);
    expect(effect.summary).toEqual([]);
    expect(effect.saved).toEqual(zod.saved);
    expect(zod.saved).toMatchObject({ nickname: "", note: "", name: "Aroha" });
  });

  it("on a cleared optional number: no error, the value is absent in both; a typed number arrives as a number", async () => {
    const cleared = await both({ ...valid, tries: "" });
    expect(cleared.effect.summary).toEqual(cleared.zod.summary);
    expect(cleared.zod.summary).toEqual([]);
    expect((cleared.zod.saved as { tries?: unknown }).tries).toBeUndefined();
    expect((cleared.effect.saved as { tries?: unknown }).tries).toBeUndefined();

    const typed = await both({ ...valid, tries: "7" });
    expect((typed.zod.saved as { tries: unknown }).tries).toBe(7);
    expect((typed.effect.saved as { tries: unknown }).tries).toBe(7);
  });

  it("on a transform: the decoded number, not the text, reaches onSubmit", async () => {
    const { zod, effect } = await both(valid);
    expect((zod.saved as { qty: unknown }).qty).toBe(4);
    expect((effect.saved as { qty: unknown }).qty).toBe(4);
  });

  it("on a refinement across the struct that names a field", async () => {
    const { zod, effect } = await both({ ...valid, confirm: "Someone else" });
    expect(effect.fieldErrors).toEqual(zod.fieldErrors);
    expect(effect.summary).toEqual(zod.summary);
    expect(zod.fieldErrors.confirm).toBe("Confirm must match the name");
  });

  it("on a refinement across the struct that names no field: it reaches the summary through root", async () => {
    const { zod, effect } = await both({ ...valid, name: "Forbidden", confirm: "Forbidden" });
    expect(zod.summaryText).toContain(NOT_ALLOWED);
    expect(effect.summaryText).toContain(NOT_ALLOWED);
    expect(effect.summaryText).toBe(zod.summaryText);
    expect(effect.saved).toBeUndefined();
  });
});

describe("where the Effect and Zod form adapters differ", () => {
  // Zod runs a struct-level refinement alongside the field checks. Effect runs a struct-level check
  // only once every field has passed, so a user with a bad email AND a mismatch sees the email
  // error first, and the mismatch on the next submit. The adapter cannot change that.
  it("a struct-level check waits for the field checks in Effect, and does not in Zod", async () => {
    const { zod, effect } = await both({ ...valid, email: "bad", confirm: "Someone else" });
    expect(Object.keys(zod.fieldErrors).sort()).toEqual(["confirm", "email"]);
    expect(Object.keys(effect.fieldErrors)).toEqual(["email"]);

    const fixed = await both({ ...valid, confirm: "Someone else" });
    expect(Object.keys(fixed.effect.fieldErrors)).toEqual(["confirm"]);
  });
});

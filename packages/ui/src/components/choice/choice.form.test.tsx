import { within } from "@testing-library/dom";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { renderUi, setupUser } from "../../test-utils/index.js";
import { parseFormData as parseEffect } from "../effect/index.js";
import { parseFormData as parseZod } from "../zod/index.js";
import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "./index.js";

const PLANS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];
const TAGS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

function Signup() {
  return (
    <form>
      <Checkbox label="Accept the terms" name="terms" />
      <Switch label="Email me" name="notify" />
      <RadioGroup label="Plan" name="plan" options={PLANS} />
      <CheckboxGroup label="Tags" name="tags" options={TAGS} selectAllLabel="Select all" />
    </form>
  );
}

const zodSchema = z.object({
  terms: z.boolean(),
  notify: z.boolean(),
  plan: z.enum(["free", "pro"]).optional(),
  tags: z.array(z.enum(["a", "b", "c"])),
});

const effectSchema = Schema.Struct({
  terms: Schema.Boolean,
  notify: Schema.Boolean,
  plan: Schema.optional(Schema.Literals(["free", "pro"])),
  tags: Schema.Array(Schema.Literals(["a", "b", "c"])),
});

describe("the choice controls in a real form, validated by parseFormData", () => {
  it("unticked controls post nothing", () => {
    const { container } = renderUi(<Signup />);
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    const keys: string[] = [];
    data.forEach((_value, key) => {
      keys.push(key);
    });
    expect(keys).toEqual([]);
  });

  it("an untouched form parses to false, false, no plan and no tags", async () => {
    const { container } = renderUi(<Signup />);
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    expect(await parseZod(zodSchema, data)).toEqual({
      success: true,
      data: { terms: false, notify: false, tags: [] },
    });
  });

  it("posts what parseFormData expects, with zod and with Effect", async () => {
    const user = setupUser();
    const { container } = renderUi(<Signup />);
    await user.click(within(container).getByText("Accept the terms"));
    await user.click(within(container).getByText("Pro"));
    await user.click(within(container).getByText("Alpha"));
    await user.click(within(container).getByText("Beta"));
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    // The select-all checkbox must not add a stray "on" to the group's values.
    expect(data.getAll("tags")).toEqual(["a", "b"]);

    const expected = { terms: true, notify: false, plan: "pro", tags: ["a", "b"] };
    expect(await parseZod(zodSchema, data)).toEqual({ success: true, data: expected });
    expect(await parseEffect(effectSchema, data)).toEqual({ success: true, data: expected });
  });

  it("select all posts every value and the switch posts when on", async () => {
    const user = setupUser();
    const { container } = renderUi(<Signup />);
    await user.click(within(container).getByRole("checkbox", { name: "Select all" }));
    await user.click(within(container).getByText("Email me"));
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    const parsed = await parseZod(zodSchema, data);
    expect(parsed).toEqual({
      success: true,
      data: { terms: false, notify: true, tags: ["a", "b", "c"] },
    });
  });

  it("a tampered post of the same form is rejected on the server", async () => {
    const user = setupUser();
    const { container } = renderUi(<Signup />);
    await user.click(within(container).getByText("Pro"));
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    data.set("plan", "enterprise");
    data.append("tags", "zzz");
    const result = await parseZod(zodSchema, data);
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.errors).sort()).toEqual(["plan", "tags"]);
  });
});

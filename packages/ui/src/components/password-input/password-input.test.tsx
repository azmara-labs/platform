import { act, createRef, useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Field } from "../field/field.js";
import {
  defaultPasswordScorer,
  PasswordInput,
  type PasswordScorer,
  passwordRequirements,
} from "./index.js";

const input = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;
const toggle = (container: HTMLElement) =>
  container.querySelector("button[aria-pressed]") as HTMLButtonElement;
const describedBy = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
const live = (container: HTMLElement) =>
  container.querySelector('[aria-live="polite"].sr-only') as HTMLElement;

const RULES = [
  passwordRequirements.minLength(12),
  passwordRequirements.number(),
  passwordRequirements.symbol(),
];

describe("PasswordInput: input", () => {
  it("is a password input that forwards the ref to the real <input>", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderUi(<PasswordInput ref={ref} name="password" />);
    expect(ref.current).toBe(input(container));
    expect(input(container).type).toBe("password");
    expect(input(container).name).toBe("password");
  });

  it("defaults to autocomplete=current-password, accepts new-password, and turns off text help", () => {
    const current = renderUi(<PasswordInput />);
    expect(input(current.container).getAttribute("autocomplete")).toBe("current-password");
    expect(input(current.container).getAttribute("spellcheck")).toBe("false");
    expect(input(current.container).getAttribute("autocapitalize")).toBe("none");
    const fresh = renderUi(<PasswordInput autoComplete="new-password" />);
    expect(input(fresh.container).getAttribute("autocomplete")).toBe("new-password");
  });

  it("lets people paste", async () => {
    const user = setupUser();
    const { container } = renderUi(<PasswordInput aria-label="Password" />);
    await user.click(input(container));
    await user.paste("correct horse battery staple");
    expect(input(container).value).toBe("correct horse battery staple");
  });
});

describe("PasswordInput: show and hide", () => {
  it("toggles visibility with a pressed-state button that keeps its name", async () => {
    const user = setupUser();
    const onVisibleChange = vi.fn();
    const { container } = renderUi(
      <PasswordInput aria-label="Password" onVisibleChange={onVisibleChange} />,
    );
    const button = toggle(container);
    expect(button.getAttribute("aria-label")).toBe("Show password");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.type).toBe("button");

    await user.click(button);
    expect(input(container).type).toBe("text");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Show password");
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);

    await user.keyboard("{Enter}");
    expect(input(container).type).toBe("password");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("can start shown, be controlled and take another label", async () => {
    const user = setupUser();
    function Controlled() {
      const [visible, setVisible] = useState(true);
      return (
        <PasswordInput
          aria-label="PIN"
          toggleLabel="Show PIN"
          visible={visible}
          onVisibleChange={setVisible}
        />
      );
    }
    const { container } = renderUi(<Controlled />);
    expect(input(container).type).toBe("text");
    expect(toggle(container).getAttribute("aria-label")).toBe("Show PIN");
    await user.click(toggle(container));
    expect(input(container).type).toBe("password");

    const shown = renderUi(<PasswordInput aria-label="Password" defaultVisible />);
    expect(input(shown.container).type).toBe("text");
  });

  it("hides the password again when the form is submitted", async () => {
    const user = setupUser();
    const types: string[] = [];
    const { container } = renderUi(
      <form
        onSubmit={(event) => {
          types.push(input(container).type);
          event.preventDefault();
        }}
      >
        <PasswordInput aria-label="Password" defaultVisible />
        <Button type="submit">Sign in</Button>
      </form>,
    );
    expect(input(container).type).toBe("text");
    await user.click(container.querySelector("button[type=submit]") as HTMLButtonElement);
    // Already a password field while the submit handlers run.
    expect(types).toEqual(["password"]);
    expect(toggle(container).getAttribute("aria-pressed")).toBe("false");
  });

  it("disables the toggle with the input", () => {
    const { container } = renderUi(<PasswordInput aria-label="Password" disabled />);
    expect(input(container).disabled).toBe(true);
    expect(
      toggle(container).hasAttribute("disabled") || toggle(container).hasAttribute("data-disabled"),
    ).toBe(true);
  });
});

describe("PasswordInput: strength", () => {
  it("shows nothing until something is typed, then names the score and describes the input", async () => {
    const user = setupUser();
    const { container } = renderUi(<PasswordInput aria-label="New password" strength />);
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(0);
    expect(describedBy(input(container))).toEqual([""]);

    await user.type(input(container), "kiwi");
    expect(describedBy(input(container))).toEqual(["Very weak"]);
    expect(container.textContent).toContain("Use at least 12 characters");

    await user.type(input(container), " fruit grows on vines");
    expect(describedBy(input(container))).toEqual(["Very strong"]);
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(5);
  });

  it("uses a custom scorer and labels", async () => {
    const user = setupUser();
    const scorer: PasswordScorer = (password) => ({
      score: password.length > 3 ? 3 : 1,
      suggestion: password.length > 3 ? undefined : "Longer",
    });
    const { container } = renderUi(
      <PasswordInput
        aria-label="New password"
        strength={scorer}
        strengthLabels={["0", "Poor", "2", "Good", "4"]}
      />,
    );
    await user.type(input(container), "abc");
    expect(describedBy(input(container))).toEqual(["Poor"]);
    expect(container.textContent).toContain("Longer");
    await user.type(input(container), "d");
    expect(describedBy(input(container))).toEqual(["Good"]);
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(4);
  });

  it("rates react-hook-form default values written to the element without an event", async () => {
    function Form() {
      const { register } = useForm({ defaultValues: { password: "correct horse battery staple" } });
      return <PasswordInput aria-label="Password" strength {...register("password")} />;
    }
    const { container } = renderUi(<Form />);
    await vi.waitFor(() => expect(describedBy(input(container))).toEqual(["Very strong"]));
  });
});

describe("defaultPasswordScorer", () => {
  it("weighs length most, and marks down common and patterned passwords", () => {
    expect(defaultPasswordScorer("").score).toBe(0);
    expect(defaultPasswordScorer("Password1").score).toBe(0);
    expect(defaultPasswordScorer("Kiaora2024!").score).toBe(0);
    expect(defaultPasswordScorer("qwertyuiop").score).toBe(0);
    expect(defaultPasswordScorer("mango tree").score).toBe(1);
    expect(defaultPasswordScorer("pohutukawa bloom").score).toBe(3);
    expect(defaultPasswordScorer("correct horse battery staple").score).toBe(4);
    expect(defaultPasswordScorer("aaaaaaaaaaaaaaaa").score).toBeLessThan(
      defaultPasswordScorer("pohutukawa bloom").score,
    );
    expect(defaultPasswordScorer("abcdefgh12345678").score).toBeLessThan(3);
  });

  it("gives a suggestion until the password is strong", () => {
    expect(defaultPasswordScorer("short").suggestion).toBe("Use at least 12 characters");
    expect(defaultPasswordScorer("twelve chars").suggestion).toBe(
      "Add another word or two to make it longer",
    );
    expect(defaultPasswordScorer("correct horse battery staple").suggestion).toBeUndefined();
  });
});

describe("PasswordInput: requirements", () => {
  it("lists each rule, ticks it off as it is met, and describes the input with the list", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <PasswordInput aria-label="New password" requirements={RULES} />,
    );
    const items = () => Array.from(container.querySelectorAll("li"));
    expect(items().map((li) => li.textContent)).toEqual([
      "At least 12 characters, not done. ",
      "A number, not done. ",
      "A symbol, such as ! or #, not done. ",
    ]);
    // Each rule ends with a full stop, so they don't run together when read as a description.
    expect(describedBy(input(container))[0]).toBe(
      "At least 12 characters, not done. A number, not done. A symbol, such as ! or #, not done. ",
    );

    await user.type(input(container), "rua");
    await user.type(input(container), "2");
    expect(items().map((li) => li.hasAttribute("data-met"))).toEqual([false, true, false]);
    expect(items()[1]?.textContent).toBe("A number, done. ");
  });

  it("announces only the rules that changed, politely", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <PasswordInput aria-label="New password" requirements={RULES} />,
    );
    expect(live(container).textContent).toBe("");
    await user.type(input(container), "a");
    expect(live(container).textContent).toBe("");
    await user.type(input(container), "1");
    expect(live(container).textContent).toBe("A number: done");
    await user.type(input(container), "!");
    expect(live(container).textContent).toBe("A symbol, such as ! or #: done");
    // "a1!" plus nine letters: the length rule is met on the last key.
    await user.type(input(container), "bcdefghij");
    expect(live(container).textContent).toBe("At least 12 characters: done");
    await user.clear(input(container));
    expect(live(container).textContent).toBe(
      "At least 12 characters: not done. A number: not done. A symbol, such as ! or #: not done",
    );
  });

  it("takes custom status words", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <PasswordInput
        aria-label="Kupuhipa"
        requirements={[passwordRequirements.number("He nama")]}
        requirementStatus={{ met: "kua oti", unmet: "kāore anō" }}
      />,
    );
    expect(container.querySelector("li")?.textContent).toBe("He nama, kāore anō. ");
    await user.type(input(container), "7");
    expect(live(container).textContent).toBe("He nama: kua oti");
  });

  it("ready-made rules handle letters beyond ASCII", () => {
    expect(passwordRequirements.uppercase().test("Ā")).toBe(true);
    expect(passwordRequirements.lowercase().test("ā")).toBe(true);
    expect(passwordRequirements.symbol().test("ā1 ")).toBe(false);
    expect(passwordRequirements.symbol().test("#")).toBe(true);
  });
});

describe("PasswordInput: in a Field and with react-hook-form", () => {
  it("gets the label, required and error wiring on the input", () => {
    const { container } = renderUi(
      <Field
        label="Password"
        required
        description="Your current password."
        error="Enter your password"
      >
        <PasswordInput />
      </Field>,
    );
    const control = input(container);
    expect((container.querySelector("label") as HTMLLabelElement).htmlFor).toBe(control.id);
    expect(control.getAttribute("aria-required")).toBe("true");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy(control)).toEqual(["Your current password.", "Enter your password"]);
  });

  it("submits through register() with no Controller", async () => {
    const onSave = vi.fn();
    function SignUp() {
      const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<{ password: string }>({ defaultValues: { password: "" } });
      return (
        <form noValidate onSubmit={handleSubmit(onSave)}>
          <Field label="New password" error={errors.password?.message}>
            <PasswordInput
              autoComplete="new-password"
              strength
              requirements={RULES}
              {...register("password", { minLength: { value: 12, message: "Too short" } })}
            />
          </Field>
          <Button type="submit">Create account</Button>
        </form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<SignUp />);
    const submit = container.querySelector("button[type=submit]") as HTMLButtonElement;
    await user.type(input(container), "short1!");
    await user.click(submit);
    await vi.waitFor(() => expect(input(container).getAttribute("aria-invalid")).toBe("true"));
    await user.type(input(container), " and longer");
    await user.click(submit);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ password: "short1! and longer" });
  });

  it("passes axe with the meter and checklist", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <Field label="New password" required>
          <PasswordInput autoComplete="new-password" strength requirements={RULES} />
        </Field>
      </form>,
    );
    await expectNoA11yViolations(container);
    await user.type(input(container), "kiwi fruit 1!");
    act(() => toggle(container).click());
    await expectNoA11yViolations(container);
  });
});

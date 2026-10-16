import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { Stepper } from "./stepper.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const steps = [
  { label: "Account", description: "Your details" },
  { label: "Plan" },
  { label: "Payment" },
  { label: "Confirm" },
];
const lis = (c: HTMLElement) => Array.from(c.querySelectorAll("li")) as HTMLElement[];
const state = (li: HTMLElement) => li.getAttribute("data-status");

describe("Stepper", () => {
  it("is a named ordered list of steps", () => {
    const { container } = renderUi(<Stepper steps={steps} current={1} />);
    const ol = container.querySelector("ol") as HTMLElement;
    expect(ol.getAttribute("aria-label")).toBe("Progress");
    expect(lis(container)).toHaveLength(4);
  });

  it("the list can be renamed", () => {
    const { container } = renderUi(<Stepper steps={steps} current={0} label="Checkout progress" />);
    expect(container.querySelector("ol")?.getAttribute("aria-label")).toBe("Checkout progress");
  });

  it("steps before the current one are complete, the current is current, the rest are upcoming", () => {
    const { container } = renderUi(<Stepper steps={steps} current={2} />);
    expect(lis(container).map(state)).toEqual(["complete", "complete", "current", "upcoming"]);
  });

  it("only the current step has aria-current=step", () => {
    const { container } = renderUi(<Stepper steps={steps} current={1} />);
    expect(container.querySelectorAll("[aria-current=step]")).toHaveLength(1);
    expect(lis(container)[1]?.getAttribute("aria-current")).toBe("step");
  });

  it("state is in text, not only colour: each step says complete, current or not started", () => {
    const { container } = renderUi(<Stepper steps={steps} current={1} />);
    const spoken = lis(container).map((li) => li.querySelector(".sr-only")?.textContent);
    expect(spoken).toEqual(["Completed", "Current step", "Not started", "Not started"]);
  });

  it("the status words can be translated", () => {
    const { container } = renderUi(
      <Stepper
        steps={steps}
        current={1}
        statusLabels={{
          complete: "Terminé",
          current: "En cours",
          upcoming: "À venir",
          error: "Erreur",
        }}
      />,
    );
    expect(lis(container)[0]?.querySelector(".sr-only")?.textContent).toBe("Terminé");
  });

  it("shows the step number, or a check once complete (decorative)", () => {
    const { container } = renderUi(<Stepper steps={steps} current={1} />);
    const [done, now, later] = lis(container) as [HTMLElement, HTMLElement, HTMLElement];
    expect(done.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(done.querySelector("[data-azmr-step-indicator]")?.textContent).not.toContain("1");
    expect(now.querySelector("[data-azmr-step-indicator]")?.textContent).toBe("2");
    expect(later.querySelector("[data-azmr-step-indicator]")?.textContent).toBe("3");
  });

  it("renders labels and optional descriptions", () => {
    const { container } = renderUi(<Stepper steps={steps} current={0} />);
    expect(lis(container)[0]?.textContent).toContain("Account");
    expect(lis(container)[0]?.textContent).toContain("Your details");
    expect(lis(container)[1]?.textContent).not.toContain("Your details");
  });

  it("a current beyond the last step means everything is complete", () => {
    const { container } = renderUi(<Stepper steps={steps} current={4} />);
    expect(lis(container).map(state)).toEqual(["complete", "complete", "complete", "complete"]);
    expect(container.querySelector("[aria-current=step]")).toBeNull();
  });

  it("a current before the first step means nothing has started", () => {
    const { container } = renderUi(<Stepper steps={steps} current={-1} />);
    expect(lis(container).map(state)).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("a step can be marked as failed, which does not change the others", () => {
    const { container } = renderUi(
      <Stepper
        steps={[{ label: "A" }, { label: "B", status: "error" }, { label: "C" }]}
        current={1}
      />,
    );
    const li = lis(container);
    expect(state(li[1] as HTMLElement)).toBe("error");
    expect(li[1]?.querySelector(".sr-only")?.textContent).toBe("Error");
    expect(li[1]?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(classes(li[1]?.querySelector("[data-azmr-step-indicator]") ?? null)).toContain(
      "border-destructive",
    );
    expect(state(li[0] as HTMLElement)).toBe("complete");
  });

  it("joins the steps with a line: filled up to the current step, none after the last", () => {
    const { container } = renderUi(<Stepper steps={steps} current={2} />);
    const connectors = Array.from(container.querySelectorAll("[data-azmr-step-connector]"));
    expect(connectors).toHaveLength(3);
    expect(classes(connectors[0] ?? null)).toContain("bg-primary");
    expect(classes(connectors[1] ?? null)).toContain("bg-primary");
    expect(classes(connectors[2] ?? null)).toContain("bg-border");
    expect(connectors.every((c) => c.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("lays out in a row by default and in a column when vertical", () => {
    const a = renderUi(<Stepper steps={steps} current={0} />);
    expect(a.container.querySelector("ol")?.getAttribute("data-orientation")).toBe("horizontal");
    expect(classes(a.container.querySelector("ol"))).toContain("flex-row");
    a.unmount();
    const b = renderUi(<Stepper steps={steps} current={0} orientation="vertical" />);
    expect(b.container.querySelector("ol")?.getAttribute("data-orientation")).toBe("vertical");
    expect(classes(b.container.querySelector("ol"))).toContain("flex-col");
  });

  it("indicator colours come from tokens", () => {
    const { container } = renderUi(<Stepper steps={steps} current={1} />);
    const ind = (i: number) =>
      classes(lis(container)[i]?.querySelector("[data-azmr-step-indicator]") ?? null);
    expect(ind(0)).toEqual(expect.arrayContaining(["bg-primary", "text-primary-foreground"]));
    expect(ind(1)).toEqual(expect.arrayContaining(["border-primary", "text-primary"]));
    expect(ind(2)).toEqual(expect.arrayContaining(["border-border", "text-muted-foreground"]));
  });

  it("passes axe in every state and orientation", async () => {
    const a = renderUi(
      <Stepper steps={[...steps, { label: "Oops", status: "error" }]} current={2} />,
    );
    await expectNoA11yViolations(a.container);
    a.unmount();
    const b = renderUi(<Stepper steps={steps} current={1} orientation="vertical" />);
    await expectNoA11yViolations(b.container);
  });
});

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const triggers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button[aria-expanded]")) as HTMLButtonElement[];
const expanded = (container: HTMLElement) =>
  triggers(container).map((t) => t.getAttribute("aria-expanded") === "true");

function Faq(props: {
  multiple?: boolean;
  defaultValue?: string[];
  disabledSecond?: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}) {
  const { disabledSecond, headingLevel, ...root } = props;
  return (
    <Accordion {...root}>
      <AccordionItem value="a">
        <AccordionTrigger headingLevel={headingLevel}>One</AccordionTrigger>
        <AccordionContent>First answer</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b" disabled={disabledSecond}>
        <AccordionTrigger headingLevel={headingLevel}>Two</AccordionTrigger>
        <AccordionContent>Second answer</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionTrigger headingLevel={headingLevel}>Three</AccordionTrigger>
        <AccordionContent>Third answer</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion: opening", () => {
  it("starts closed, with every trigger collapsed", () => {
    const { container } = renderUi(<Faq />);
    expect(expanded(container)).toEqual([false, false, false]);
    expect(container.textContent).not.toContain("First answer");
  });

  it("opens one item at a time by default", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq />);
    await user.click(triggers(container)[0] as HTMLElement);
    expect(expanded(container)).toEqual([true, false, false]);
    await user.click(triggers(container)[1] as HTMLElement);
    await vi.waitFor(() => expect(expanded(container)).toEqual([false, true, false]));
    expect(container.textContent).toContain("Second answer");
  });

  it("allows several open at once with `multiple`", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq multiple />);
    await user.click(triggers(container)[0] as HTMLElement);
    await user.click(triggers(container)[2] as HTMLElement);
    expect(expanded(container)).toEqual([true, false, true]);
  });

  it("closes an open item when its trigger is activated again", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq defaultValue={["a"]} />);
    expect(expanded(container)).toEqual([true, false, false]);
    await user.click(triggers(container)[0] as HTMLElement);
    await vi.waitFor(() => expect(expanded(container)).toEqual([false, false, false]));
  });

  it("can be controlled", async () => {
    const user = setupUser();
    const seen: unknown[] = [];
    function Controlled() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <Accordion
          value={value}
          onValueChange={(next) => {
            seen.push(next);
            setValue(next as string[]);
          }}
        >
          <AccordionItem value="a">
            <AccordionTrigger>One</AccordionTrigger>
            <AccordionContent>x</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.click(triggers(container)[0] as HTMLElement);
    expect(seen).toEqual([["a"]]);
    expect(expanded(container)).toEqual([true]);
  });

  it("ignores a disabled item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq disabledSecond />);
    await user.click(triggers(container)[1] as HTMLElement);
    expect(expanded(container)).toEqual([false, false, false]);
  });
});

describe("Accordion: keyboard map", () => {
  it("Tab reaches the first trigger; Enter and Space toggle it", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq />);
    await user.tab();
    expect(document.activeElement).toBe(triggers(container)[0]);
    await user.keyboard("{Enter}");
    expect(expanded(container)[0]).toBe(true);
    await user.keyboard(" ");
    await vi.waitFor(() => expect(expanded(container)[0]).toBe(false));
  });

  it("ArrowDown and ArrowUp move focus between triggers without opening them", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers(container)[1]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers(container)[2]);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(triggers(container)[1]);
    expect(expanded(container)).toEqual([false, false, false]);
  });

  it("Home and End jump to the first and last trigger", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq />);
    await user.tab();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(triggers(container)[2]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(triggers(container)[0]);
  });

  it("focus skips a disabled item", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq disabledSecond />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers(container)[2]);
  });
});

describe("Accordion: keyboard map edge cases", () => {
  it("wraps from the last trigger to the first, and back", async () => {
    const user = setupUser();
    const { container } = renderUi(<Faq />);
    await user.tab();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(triggers(container)[2]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers(container)[0]);
  });

  it("stops at the ends with loopFocus={false}", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Accordion loopFocus={false}>
        <AccordionItem value="a">
          <AccordionTrigger>One</AccordionTrigger>
          <AccordionContent>x</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Two</AccordionTrigger>
          <AccordionContent>y</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.tab();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(triggers(container)[0]);
    await user.keyboard("{End}");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(triggers(container)[1]);
  });

  it("uses Left and Right when horizontal", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Accordion orientation="horizontal">
        <AccordionItem value="a">
          <AccordionTrigger>One</AccordionTrigger>
          <AccordionContent>x</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Two</AccordionTrigger>
          <AccordionContent>y</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.tab();
    await user.keyboard("{ArrowDown}"); // not this axis: ignored
    expect(document.activeElement).toBe(triggers(container)[0]);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(triggers(container)[1]);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(triggers(container)[0]);
  });

  it("does not hijack arrow keys typed inside an open panel", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Accordion defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionTrigger>One</AccordionTrigger>
          <AccordionContent>
            <input aria-label="note" defaultValue="hello" />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Two</AccordionTrigger>
          <AccordionContent>y</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("{ArrowDown}{Home}");
    expect(document.activeElement).toBe(input);
  });

  it("keeps a nested accordion's arrow keys inside it", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Accordion defaultValue={["outer"]}>
        <AccordionItem value="outer">
          <AccordionTrigger>Outer</AccordionTrigger>
          <AccordionContent>
            <Accordion defaultValue={["i1"]}>
              <AccordionItem value="i1">
                <AccordionTrigger>Inner one</AccordionTrigger>
                <AccordionContent>x</AccordionContent>
              </AccordionItem>
              <AccordionItem value="i2">
                <AccordionTrigger>Inner two</AccordionTrigger>
                <AccordionContent>y</AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="next">
          <AccordionTrigger>After</AccordionTrigger>
          <AccordionContent>z</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const all = triggers(container);
    const innerOne = all.find((t) => t.textContent === "Inner one") as HTMLElement;
    const innerTwo = all.find((t) => t.textContent === "Inner two") as HTMLElement;
    innerOne.focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(innerTwo);
    await user.keyboard("{ArrowDown}"); // wraps inside the inner accordion, not out to "After"
    expect(document.activeElement).toBe(innerOne);
  });
});

describe("Accordion: structure and styling", () => {
  it("puts each trigger in a heading (h3 by default) so the outline works", () => {
    const { container } = renderUi(<Faq />);
    const headings = container.querySelectorAll("h3");
    expect(headings).toHaveLength(3);
    expect(headings[0]?.querySelector("button")).not.toBeNull();
  });

  it("lets the heading level be chosen", () => {
    const { container } = renderUi(<Faq headingLevel={2} />);
    expect(container.querySelectorAll("h2")).toHaveLength(3);
    expect(container.querySelectorAll("h3")).toHaveLength(0);
  });

  it("links each open trigger to its panel", () => {
    const { container } = renderUi(<Faq defaultValue={["a"]} />);
    const id = triggers(container)[0]?.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toContain("First answer");
  });

  it("rotates the chevron with the open state and decorates it for assistive technology", () => {
    const { container } = renderUi(<Faq />);
    const icon = triggers(container)[0]?.querySelector("svg") as SVGElement;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(classes(icon)).toContain("transition-transform");
    expect(
      classes(triggers(container)[0] as Element).some((c) =>
        c.includes("data-[panel-open]:[&>svg]:rotate-180"),
      ),
    ).toBe(true);
  });

  it("animates the panel height with the motion tokens", () => {
    const { container } = renderUi(<Faq defaultValue={["a"]} />);
    const panel = container.querySelector("[class*='accordion-panel-height']");
    const list = classes(panel);
    expect(list).toContain("h-(--accordion-panel-height)");
    expect(list).toContain("data-[starting-style]:h-0");
    expect(list).toContain("data-[ending-style]:h-0");
    expect(list).toContain("duration-(--motion-duration-base)");
  });

  it("has a full-strength focus ring on triggers", () => {
    const { container } = renderUi(<Faq />);
    expect(classes(triggers(container)[0] as Element)).toContain("focus-visible:ring-ring");
  });
});

describe("Accordion: accessibility", () => {
  it("passes axe closed and with items open", async () => {
    const closed = renderUi(<Faq />);
    await expectNoA11yViolations(closed.container);
    const open = renderUi(<Faq multiple defaultValue={["a", "c"]} />);
    await expectNoA11yViolations(open.container);
  });
});

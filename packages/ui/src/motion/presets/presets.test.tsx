import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { AnimatedCheck } from "./animated-check.js";
import { Collapse } from "./collapse.js";
import { motionPresets } from "./presets.js";
import { Stagger } from "./stagger.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Collapse", () => {
  it("is open or closed, shown in data-state", () => {
    const open = renderUi(<Collapse open>Body</Collapse>);
    expect((open.container.firstElementChild as HTMLElement).getAttribute("data-state")).toBe(
      "open",
    );
    open.unmount();
    const closed = renderUi(<Collapse open={false}>Body</Collapse>);
    expect((closed.container.firstElementChild as HTMLElement).getAttribute("data-state")).toBe(
      "closed",
    );
  });

  it("a closed collapse is inert, so its content cannot be focused or read", () => {
    const { container } = renderUi(
      <Collapse open={false}>
        <button type="button">Hidden action</button>
      </Collapse>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.hasAttribute("inert")).toBe(true);
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("an open collapse is not inert", () => {
    const { container } = renderUi(<Collapse open>Body</Collapse>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps its content mounted while closed (so it can animate, and keep its state)", () => {
    const { container } = renderUi(<Collapse open={false}>Still here</Collapse>);
    expect(container.textContent).toContain("Still here");
  });

  it("uses the collapse preset classes, with an inner element that can shrink", () => {
    const { container } = renderUi(<Collapse open>Body</Collapse>);
    const root = container.firstElementChild as HTMLElement;
    expect(classes(root)).toContain(motionPresets.collapse.root);
    expect(classes(root.firstElementChild)).toContain(motionPresets.collapse.inner);
    expect(root.firstElementChild?.textContent).toBe("Body");
  });

  it("passes id, className and aria-labelledby through, so a trigger can point at it", () => {
    const { container } = renderUi(
      <Collapse open id="details" className="mt-2" aria-labelledby="t">
        Body
      </Collapse>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.id).toBe("details");
    expect(classes(root)).toContain("mt-2");
    expect(root.getAttribute("aria-labelledby")).toBe("t");
  });

  it("passes axe open and closed", async () => {
    const a = renderUi(<Collapse open>Body</Collapse>);
    await expectNoA11yViolations(a.container);
    a.unmount();
    const b = renderUi(<Collapse open={false}>Body</Collapse>);
    await expectNoA11yViolations(b.container);
  });
});

describe("Stagger", () => {
  it("gives each child an index for its delay", () => {
    const { container } = renderUi(
      <Stagger>
        <li>One</li>
        <li>Two</li>
        <li>Three</li>
      </Stagger>,
    );
    const items = Array.from(container.querySelectorAll("li")) as HTMLElement[];
    expect(items.map((i) => i.style.getPropertyValue("--stagger-index"))).toEqual(["0", "1", "2"]);
    for (const item of items) expect(classes(item)).toContain(motionPresets.stagger.item);
  });

  it("caps the index so a long list does not take forever to appear", () => {
    const { container } = renderUi(
      <Stagger max={3}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <li key={n}>{n}</li>
        ))}
      </Stagger>,
    );
    const idx = Array.from(container.querySelectorAll("li")).map((i) =>
      (i as HTMLElement).style.getPropertyValue("--stagger-index"),
    );
    expect(idx).toEqual(["0", "1", "2", "3", "3", "3", "3", "3"]);
  });

  it("keeps a child's own className and style", () => {
    const { container } = renderUi(
      <Stagger>
        <li className="mine" style={{ color: "red" }}>
          One
        </li>
      </Stagger>,
    );
    const li = container.querySelector("li") as HTMLElement;
    expect(classes(li)).toEqual(expect.arrayContaining(["mine", motionPresets.stagger.item]));
    expect(li.style.color).toBe("red");
  });

  it("ignores text and empty children instead of breaking", () => {
    const { container } = renderUi(
      <Stagger>
        {"text"}
        {null}
        {false}
        <li>Real</li>
      </Stagger>,
    );
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(container.textContent).toContain("text");
  });

  it("is a div by default, and caps at twelve steps by default", () => {
    const { container } = renderUi(
      <Stagger>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => (
          <p key={n}>{n}</p>
        ))}
      </Stagger>,
    );
    expect((container.firstElementChild as HTMLElement).tagName).toBe("DIV");
    const idx = Array.from(container.querySelectorAll("p")).map((e) =>
      (e as HTMLElement).style.getPropertyValue("--stagger-index"),
    );
    expect(idx[12]).toBe("12");
    expect(idx[15]).toBe("12");
  });

  it("renders as the element you choose, as the stagger container", () => {
    const { container } = renderUi(
      <Stagger as="ul" className="list">
        <li>One</li>
      </Stagger>,
    );
    const ul = container.firstElementChild as HTMLElement;
    expect(ul.tagName).toBe("UL");
    expect(classes(ul)).toEqual(expect.arrayContaining(["list", motionPresets.stagger.container]));
  });

  it("passes axe", async () => {
    const { container } = renderUi(
      <Stagger as="ul">
        <li>One</li>
        <li>Two</li>
      </Stagger>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("AnimatedCheck", () => {
  it("is decorative by default", () => {
    const { container } = renderUi(<AnimatedCheck />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
  });

  it("with a label it is an image with a name", () => {
    const { container } = renderUi(<AnimatedCheck label="Saved" />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Saved");
    expect(svg.hasAttribute("aria-hidden")).toBe(false);
  });

  it("draws its tick with the check preset, in the current text colour", () => {
    const { container } = renderUi(<AnimatedCheck />);
    const path = container.querySelector("path") as SVGPathElement;
    expect(classes(container.querySelector("svg"))).toContain(motionPresets.checkDraw);
    expect(path.getAttribute("stroke")).toBe("currentColor");
    expect(path.getAttribute("pathLength")).toBe("24");
  });

  it("takes a size and className", () => {
    const { container } = renderUi(<AnimatedCheck size={32} className="text-success" />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("32");
    expect(classes(svg)).toContain("text-success");
  });

  it("passes axe, decorative and labelled", async () => {
    const a = renderUi(<AnimatedCheck />);
    await expectNoA11yViolations(a.container);
    a.unmount();
    const b = renderUi(<AnimatedCheck label="Done" />);
    await expectNoA11yViolations(b.container);
  });
});

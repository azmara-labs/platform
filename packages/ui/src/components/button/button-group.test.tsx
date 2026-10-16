import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "./button.js";
import { ButtonGroup } from "./button-group.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const group = (container: HTMLElement) => container.querySelector("[role=group]") as HTMLElement;

describe("ButtonGroup", () => {
  it("is a named group of its buttons", () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="Text alignment">
        <Button variant="outline">Left</Button>
        <Button variant="outline">Centre</Button>
      </ButtonGroup>,
    );
    expect(group(container).getAttribute("aria-label")).toBe("Text alignment");
    expect(group(container).querySelectorAll("button")).toHaveLength(2);
  });

  it("requires a name (the types enforce it)", () => {
    // @ts-expect-error a group of buttons needs an accessible name
    const missing = <ButtonGroup>Nothing</ButtonGroup>;
    expect(missing).toBeTruthy();
  });

  it("can be named by another element instead", () => {
    const { container } = renderUi(
      <div>
        <h2 id="h">Alignment</h2>
        <ButtonGroup aria-labelledby="h">
          <Button>A</Button>
        </ButtonGroup>
      </div>,
    );
    expect(group(container).getAttribute("aria-labelledby")).toBe("h");
  });

  it("joins its buttons: square inner corners, one shared border", () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="x">
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    expect(classes(group(container))).toEqual(
      expect.arrayContaining([
        "inline-flex",
        "[&>*:not(:first-child)]:rounded-l-none",
        "[&>*:not(:last-child)]:rounded-r-none",
        "[&>*:not(:first-child)]:-ml-px",
      ]),
    );
  });

  it("raises the focused or hovered button so its outline is not hidden by a neighbour", () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="x">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect(classes(group(container))).toEqual(
      expect.arrayContaining(["[&>*]:relative", "[&>*:focus-visible]:z-10", "[&>*:hover]:z-10"]),
    );
  });

  it("stacks vertically and joins top to bottom", () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="x" orientation="vertical">
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    // aria-orientation is not allowed on role=group, so the orientation is exposed for styling only.
    expect(group(container).getAttribute("data-orientation")).toBe("vertical");
    expect(group(container).hasAttribute("aria-orientation")).toBe(false);
    expect(classes(group(container))).toEqual(
      expect.arrayContaining([
        "flex-col",
        "[&>*:not(:first-child)]:rounded-t-none",
        "[&>*:not(:last-child)]:rounded-b-none",
        "[&>*:not(:first-child)]:-mt-px",
      ]),
    );
  });

  it("can be spaced instead of joined", () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="x" attached={false}>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    expect(classes(group(container))).toContain("gap-2");
    expect(classes(group(container))).not.toContain("[&>*:not(:first-child)]:rounded-l-none");
  });

  it("is not a roving group: Tab visits every button (use ToggleGroup for arrow keys)", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <ButtonGroup aria-label="x">
        <Button>A</Button>
        <Button>B</Button>
        <Button>C</Button>
      </ButtonGroup>,
    );
    const buttons = container.querySelectorAll("button");
    await user.tab();
    expect(document.activeElement).toBe(buttons[0]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[1]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("passes axe", async () => {
    const { container } = renderUi(
      <ButtonGroup aria-label="Actions">
        <Button variant="outline">One</Button>
        <Button variant="outline">Two</Button>
      </ButtonGroup>,
    );
    await expectNoA11yViolations(container);
  });
});

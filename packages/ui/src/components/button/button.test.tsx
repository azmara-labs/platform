import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  expectNoA11yViolations,
  findA11yViolations,
  renderUi,
  setupUser,
  withReducedMotion,
} from "../../test-utils/index.js";
import { Button } from "./button.js";

const q = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;

describe("Button: rendering", () => {
  it("renders a native button with type=button by default (never submits by accident)", () => {
    const { container } = renderUi(<Button>Save</Button>);
    const button = q(container);
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toBe("Save");
    expect(button.type).toBe("button");
  });

  it("lets a form submit button opt in", () => {
    const { container } = renderUi(<Button type="submit">Send</Button>);
    expect(q(container).type).toBe("submit");
  });

  it("forwards the ref to the real DOM button", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUi(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes through arbitrary attributes", () => {
    const { container } = renderUi(
      <Button data-testid="b" title="Hint" name="action" value="go">
        x
      </Button>,
    );
    const button = q(container);
    expect(button.getAttribute("data-testid")).toBe("b");
    expect(button.title).toBe("Hint");
    expect(button.name).toBe("action");
    expect(button.value).toBe("go");
  });

  it("can render as a link through the render prop", () => {
    const { container } = renderUi(
      <Button nativeButton={false} render={<a href="/docs" />}>
        Docs
      </Button>,
    );
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/docs");
    expect(link.textContent).toBe("Docs");
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("Button: variants and sizes (tokens only)", () => {
  it("uses the primary token pair by default", () => {
    const { container } = renderUi(<Button>x</Button>);
    expect(q(container).className).toContain("bg-primary");
    expect(q(container).className).toContain("text-primary-foreground");
  });

  it.each([
    ["secondary", "bg-secondary"],
    ["outline", "border-input"],
    ["ghost", "hover:bg-accent"],
    ["destructive", "bg-destructive"],
    ["link", "underline-offset-4"],
  ] as const)("variant %s applies %s", (variant, expected) => {
    const { container } = renderUi(<Button variant={variant}>x</Button>);
    expect(q(container).className).toContain(expected);
  });

  it("only the default variant carries the primary background", () => {
    const { container } = renderUi(<Button variant="destructive">x</Button>);
    expect(q(container).className).not.toContain("bg-primary");
  });

  it("sizes change the height; the default follows the density token", () => {
    const md = renderUi(<Button>x</Button>);
    expect(q(md.container).className).toContain("h-(--density-control-height)");
    const lg = renderUi(<Button size="lg">x</Button>);
    expect(q(lg.container).className).toContain("h-11");
    const sm = renderUi(<Button size="sm">x</Button>);
    expect(q(sm.container).className).toContain("h-8");
  });

  it("lets className override defaults (tailwind-merge, last wins)", () => {
    const { container } = renderUi(<Button className="h-12 bg-secondary">x</Button>);
    const classes = q(container).className.split(/\s+/);
    expect(classes).toContain("h-12");
    expect(classes).not.toContain("h-(--density-control-height)");
    expect(classes).toContain("bg-secondary");
    expect(classes).not.toContain("bg-primary");
  });

  it("uses motion tokens for transitions", () => {
    const { container } = renderUi(<Button>x</Button>);
    expect(q(container).className).toContain("duration-(--motion-duration-fast)");
  });
});

describe("Button: interaction", () => {
  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Button onClick={onClick}>Go</Button>);
    await user.click(q(container));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates with Enter and with Space", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Button onClick={onClick}>Go</Button>);
    await user.tab();
    expect(document.activeElement).toBe(q(container));
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does nothing when disabled, and is skipped by Tab", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <Button disabled onClick={onClick}>
          Off
        </Button>
        <Button>On</Button>
      </div>,
    );
    const [off, on] = Array.from(container.querySelectorAll("button"));
    expect(off?.disabled).toBe(true);
    await user.click(off as HTMLButtonElement);
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(document.activeElement).toBe(on);
  });
});

describe("Button: loading", () => {
  it("shows a spinner, marks itself busy and ignores clicks", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = q(container);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.hasAttribute("data-loading")).toBe(true);
    expect(button.querySelector("svg")).not.toBeNull();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays focusable while loading so keyboard users do not lose their place", async () => {
    const user = setupUser();
    const { container } = renderUi(<Button loading>Save</Button>);
    await user.tab();
    expect(document.activeElement).toBe(q(container));
  });

  it("does not activate with the keyboard while loading", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    renderUi(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("swaps the label for loadingText", () => {
    const { container } = renderUi(
      <Button loading loadingText="Saving">
        Save
      </Button>,
    );
    expect(q(container).textContent).toBe("Saving");
  });

  it("keeps the label when there is no loadingText", () => {
    const { container } = renderUi(<Button loading>Save</Button>);
    expect(q(container).textContent).toBe("Save");
  });

  it("replaces the start icon with the spinner but keeps the end icon", () => {
    const { container } = renderUi(
      <Button loading startIcon={<i data-testid="start" />} endIcon={<i data-testid="end" />}>
        Save
      </Button>,
    );
    expect(container.querySelector("[data-testid=start]")).toBeNull();
    expect(container.querySelector("[data-testid=end]")).not.toBeNull();
  });

  it("is not busy when not loading", () => {
    const { container } = renderUi(<Button>Save</Button>);
    expect(q(container).hasAttribute("aria-busy")).toBe(false);
    expect(q(container).hasAttribute("data-loading")).toBe(false);
  });

  it("keeps the spinner moving under reduced motion (it is an essential progress indicator)", () => {
    withReducedMotion(() => {
      const { container } = renderUi(<Button loading>Save</Button>);
      expect(container.querySelector("svg")?.getAttribute("data-motion")).toBe("essential");
    });
  });
});

describe("Button: icons", () => {
  it("renders start and end icons around the label", () => {
    const { container } = renderUi(
      <Button startIcon={<i data-testid="start" />} endIcon={<i data-testid="end" />}>
        Label
      </Button>,
    );
    const start = container.querySelector("[data-testid=start]");
    const end = container.querySelector("[data-testid=end]");
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    const label = Array.from(q(container).childNodes).find(
      (n) => n.textContent === "Label",
    ) as Node;
    // DOM order: start icon, then the label text, then the end icon
    expect(start?.compareDocumentPosition(label) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(label.compareDocumentPosition(end as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows no spinner when not loading", () => {
    const { container } = renderUi(<Button startIcon={<i data-testid="start" />}>Label</Button>);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("[data-testid=start]")).not.toBeNull();
  });
});

describe("Button: accessibility", () => {
  it("passes axe with a text label", async () => {
    const { container } = renderUi(<Button>Save changes</Button>);
    await expectNoA11yViolations(container);
  });

  it("passes axe for every variant while loading and disabled", async () => {
    for (const variant of [
      "default",
      "secondary",
      "outline",
      "ghost",
      "destructive",
      "link",
    ] as const) {
      const { container } = renderUi(
        <div>
          <Button variant={variant} loading>
            Busy
          </Button>
          <Button variant={variant} disabled>
            Off
          </Button>
        </div>,
      );
      await expectNoA11yViolations(container);
    }
  });

  it("passes axe for an icon-only button that has an accessible name", async () => {
    const { container } = renderUi(
      <Button size="icon" aria-label="Close">
        <i aria-hidden="true" />
      </Button>,
    );
    await expectNoA11yViolations(container);
  });

  it("axe flags an icon-only button with no name (which the types also reject)", async () => {
    // @ts-expect-error size="icon" requires aria-label or aria-labelledby
    const { container } = renderUi(<Button size="icon" />);
    const violations = await findA11yViolations(container);
    expect(violations.map((v) => v.id)).toContain("button-name");
  });
});

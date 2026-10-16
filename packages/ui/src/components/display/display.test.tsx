import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Alert, AlertDescription, AlertTitle } from "./alert.js";
import { Badge } from "./badge.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card.js";
import { EmptyState } from "./empty-state.js";
import { Skeleton } from "./skeleton.js";

const first = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

describe("Card", () => {
  it("renders a surface from tokens with its parts", () => {
    const { container } = renderUi(
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>Everyone you work with.</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(classes(first(container))).toEqual(
      expect.arrayContaining(["rounded-xl", "border", "bg-card", "text-card-foreground"]),
    );
    expect(container.querySelector("h3")?.textContent).toBe("Customers");
    expect(container.textContent).toContain("Everyone you work with.");
    expect(container.textContent).toContain("Footer");
  });

  it("lets the title be any heading level", () => {
    const { container } = renderUi(<CardTitle as="h2">Title</CardTitle>);
    expect(first(container).tagName).toBe("H2");
  });

  it("merges className last and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderUi(
      <Card ref={ref} className="rounded-none">
        x
      </Card>,
    );
    expect(ref.current).toBe(first(container));
    expect(classes(first(container))).toContain("rounded-none");
    expect(classes(first(container))).not.toContain("rounded-xl");
  });
});

describe("Badge", () => {
  it.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border-border"],
    ["destructive", "text-destructive"],
    ["success", "text-success"],
    ["warning", "text-warning-text"],
    ["info", "text-info"],
  ] as const)("variant %s uses %s", (variant, cls) => {
    const { container } = renderUi(<Badge variant={variant}>x</Badge>);
    expect(classes(first(container))).toContain(cls);
  });

  it("is an inline span by default and merges className", () => {
    const { container } = renderUi(<Badge className="px-4">x</Badge>);
    expect(first(container).tagName).toBe("SPAN");
    expect(classes(first(container))).toContain("px-4");
    expect(classes(first(container))).not.toContain("px-2");
  });
});

describe("Alert", () => {
  it.each([
    ["info", "status"],
    ["success", "status"],
    ["warning", "alert"],
    ["destructive", "alert"],
  ] as const)(
    "variant %s has role %s (polite for info, assertive for problems)",
    (variant, role) => {
      const { container } = renderUi(<Alert variant={variant}>x</Alert>);
      expect(first(container).getAttribute("role")).toBe(role);
    },
  );

  it("defaults to info (info icon and info tint, not success)", () => {
    const { container } = renderUi(<Alert>x</Alert>);
    expect(first(container).getAttribute("role")).toBe("status");
    expect(classes(first(container))).toContain("bg-info/10");
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("lucide-info");
  });

  it("shows a default icon per variant, hidden from assistive technology", () => {
    const { container } = renderUi(<Alert variant="destructive">x</Alert>);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("class")).toContain("lucide-circle-alert");
  });

  it("renders a title and description", () => {
    const { container } = renderUi(
      <Alert variant="success">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes are live.</AlertDescription>
      </Alert>,
    );
    expect(container.textContent).toContain("Saved");
    expect(container.textContent).toContain("Your changes are live.");
  });

  it("has no dismiss button unless asked", () => {
    const { container } = renderUi(<Alert>x</Alert>);
    expect(container.querySelector("button")).toBeNull();
  });

  it("dismisses with a labelled button that calls onDismiss", async () => {
    const onDismiss = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Alert onDismiss={onDismiss}>x</Alert>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Dismiss");
    expect(button.type).toBe("button");
    await user.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is keyboard dismissible with Enter and Space, and the label can be localised", async () => {
    const onDismiss = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <Alert onDismiss={onDismiss} dismissLabel="Kati">
        x
      </Alert>,
    );
    await user.tab();
    expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("Kati");
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("lets the caller replace the icon or remove it", () => {
    const custom = renderUi(<Alert icon={<i data-testid="mine" />}>x</Alert>);
    expect(custom.container.querySelector("[data-testid=mine]")).not.toBeNull();
    expect(custom.container.querySelector("svg")).toBeNull();
    const none = renderUi(<Alert icon={null}>x</Alert>);
    expect(none.container.querySelector("svg")).toBeNull();
  });

  it("merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = renderUi(
      <Alert ref={ref} className="mt-4">
        x
      </Alert>,
    );
    expect(ref.current).toBe(first(container));
    expect(classes(first(container))).toContain("mt-4");
  });
});

describe("Skeleton", () => {
  it("is a decorative placeholder (hidden from assistive technology)", () => {
    const { container } = renderUi(<Skeleton className="h-4 w-32" />);
    const el = first(container);
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(classes(el)).toEqual(
      expect.arrayContaining(["animate-pulse", "bg-muted", "h-4", "w-32"]),
    );
  });

  it("can be turned into a still placeholder", () => {
    const { container } = renderUi(<Skeleton animate={false} />);
    expect(classes(first(container))).not.toContain("animate-pulse");
  });

  it("can sweep a highlight across instead of pulsing (the shimmer preset)", () => {
    const { container } = renderUi(<Skeleton shimmer className="h-4 w-32" />);
    expect(classes(first(container))).toContain("motion-shimmer");
    expect(classes(first(container))).not.toContain("animate-pulse");
  });

  it("a still shimmer skeleton does not shimmer", () => {
    const { container } = renderUi(<Skeleton shimmer animate={false} />);
    expect(classes(first(container))).not.toContain("motion-shimmer");
  });
});

describe("EmptyState", () => {
  it("shows a title, description, icon and action", () => {
    const { container } = renderUi(
      <EmptyState
        icon={<i data-testid="ico" />}
        title="No customers yet"
        description="Add your first customer to get started."
        action={<button type="button">Add customer</button>}
      />,
    );
    expect(container.querySelector("h3")?.textContent).toBe("No customers yet");
    expect(container.textContent).toContain("Add your first customer");
    expect(container.querySelector("[data-testid=ico]")).not.toBeNull();
    expect(container.querySelector("button")?.textContent).toBe("Add customer");
  });

  it("works with only a title, and the heading level can change", () => {
    const { container } = renderUi(<EmptyState title="Nothing here" headingLevel={2} />);
    expect(container.querySelector("h2")?.textContent).toBe("Nothing here");
    expect(container.querySelector("p")).toBeNull();
  });
});

describe("display: accessibility", () => {
  it("passes axe for a composed screen", async () => {
    const { container } = renderUi(
      <main>
        <Alert variant="warning" onDismiss={() => {}}>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Your plan renews tomorrow.</AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>
              <Badge variant="success">Active</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
        <EmptyState title="No invoices" description="They will appear here." />
      </main>,
    );
    await expectNoA11yViolations(container);
  });
});

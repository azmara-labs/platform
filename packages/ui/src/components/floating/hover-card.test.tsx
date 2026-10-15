import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const link = (container: HTMLElement) => container.querySelector("a") as HTMLAnchorElement;
const card = () =>
  (document.querySelector("[data-testid=card]")?.closest("[class*='bg-popover']") ??
    null) as HTMLElement | null;

function Demo(props: { delay?: number }) {
  return (
    <HoverCard>
      <HoverCardTrigger href="/people/aroha" delay={props.delay ?? 0} closeDelay={0}>
        Aroha
      </HoverCardTrigger>
      <HoverCardContent>
        <p data-testid="card">Aroha Ngata, designer</p>
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  it("is a real link that works without the card (the card is only a preview)", () => {
    const { container } = renderUi(<Demo />);
    expect(link(container).getAttribute("href")).toBe("/people/aroha");
    expect(card()).toBeNull();
  });

  it("opens when the link is hovered and closes when the pointer leaves", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(link(container));
    await vi.waitFor(() => expect(card()).not.toBeNull());
    await user.unhover(link(container));
    await vi.waitFor(() => expect(card()).toBeNull());
  });

  it("opens on keyboard focus, so it is not mouse-only", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    expect(document.activeElement).toBe(link(container));
    await vi.waitFor(() => expect(card()).not.toBeNull());
  });

  it("closes on Escape", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.tab();
    await vi.waitFor(() => expect(card()).not.toBeNull());
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(card()).toBeNull());
    expect(document.activeElement).toBe(link(container));
  });

  it("waits for the delay (hover intent) before opening", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo delay={400} />);
    await user.hover(link(container));
    expect(card()).toBeNull();
    await vi.waitFor(() => expect(card()).not.toBeNull(), { timeout: 2000 });
  });

  it("uses a popover surface above overlays, animated with the motion tokens", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.hover(link(container));
    await vi.waitFor(() => expect(card()).not.toBeNull());
    const surface = card() as HTMLElement;
    expect(container.contains(surface)).toBe(false);
    expect(classes(surface.parentElement)).toContain("z-(--z-popover)");
    expect(classes(surface)).toEqual(
      expect.arrayContaining([
        "bg-popover",
        "text-popover-foreground",
        "shadow-elevation-3",
        "origin-(--transform-origin)",
        "duration-(--motion-duration-fast)",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
      ]),
    );
  });

  it("passes axe with the card open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await expectNoA11yViolations(document.body);
    await user.hover(link(container));
    await vi.waitFor(() => expect(card()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});

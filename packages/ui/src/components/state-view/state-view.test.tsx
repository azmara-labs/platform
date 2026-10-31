import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { StateView } from "./index.js";

const view = (c: HTMLElement) => c.firstElementChild as HTMLElement;

describe("StateView", () => {
  it("loading: a polite status with the title as its message, after a delay", () => {
    const { container } = renderUi(<StateView state="loading" title="Loading invoices…" />);
    const el = view(container);
    expect(el.getAttribute("role")).toBe("status");
    expect(el.dataset.state).toBe("loading");
    expect(el.textContent).toBe("Loading invoices…");
    expect(el.style.animationDelay).toBe("200ms");
  });

  it("empty: plain content with a heading, inbox icon, description and action", () => {
    const { container } = renderUi(
      <StateView
        state="empty"
        title="No invoices yet"
        description="Invoices you create appear here."
        action={<button type="button">Create invoice</button>}
      />,
    );
    const el = view(container);
    expect(el.hasAttribute("role")).toBe(false);
    expect(el.dataset.state).toBe("empty");
    expect(el.querySelector("h2")?.textContent).toBe("No invoices yet");
    expect(el.querySelector('[data-slot="state-view-icon"]')?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(el.querySelector('[data-slot="state-view-icon"] svg')).not.toBeNull();
    expect(el.textContent).toContain("Invoices you create appear here.");
    expect(el.querySelector("button")?.textContent).toBe("Create invoice");
  });

  it("error: an alert with a generic default title and the destructive colour", () => {
    const { container } = renderUi(<StateView state="error" />);
    const el = view(container);
    expect(el.getAttribute("role")).toBe("alert");
    expect(el.querySelector("h2")?.textContent).toBe("Something went wrong");
    expect(el.querySelector('[data-slot="state-view-icon"]')?.className).toContain(
      "text-destructive",
    );
  });

  it("has defaults for every state", () => {
    expect(view(renderUi(<StateView state="empty" />).container).textContent).toBe(
      "Nothing here yet",
    );
    expect(view(renderUi(<StateView state="loading" />).container).textContent).toBe("Loading…");
  });

  it("takes a custom icon, or none, and a heading level", () => {
    const custom = renderUi(
      <StateView state="empty" icon={<span data-testid="mine" />} titleAs="h3" />,
    );
    expect(custom.container.querySelector('[data-testid="mine"]')).not.toBeNull();
    expect(custom.container.querySelector("h3")).not.toBeNull();
    const none = renderUi(<StateView state="empty" icon={null} />);
    expect(none.container.querySelector('[data-slot="state-view-icon"]')).toBeNull();
  });

  it("fills a page or a section, and merges className last", () => {
    const page = view(
      renderUi(<StateView state="empty" variant="page" className="p-2" />).container,
    );
    expect(page.className).toContain("min-h-[60vh]");
    expect(page.className).toContain("p-2");
    expect(page.className).not.toContain("p-8");
    const section = view(renderUi(<StateView state="error" />).container);
    expect(section.className).toContain("min-h-32");
  });

  it("passes axe in every state", async () => {
    for (const state of ["loading", "empty", "error"] as const) {
      const { container, unmount } = renderUi(
        <main>
          <h1>Invoices</h1>
          <StateView state={state} description="More detail." />
        </main>,
      );
      await expectNoA11yViolations(container);
      unmount();
    }
  });
});

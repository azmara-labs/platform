import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { ErrorBoundary } from "./index.js";

const SECRET = "Failed to load customer aroha@example.co.nz (row 4123)";

let shouldThrow = true;
function Flaky({ error = new Error(SECRET) }: { error?: unknown }) {
  if (shouldThrow) throw error;
  return <p>Recovered</p>;
}

// React logs caught render errors to console.error; keep the output clean and the test honest.
let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  shouldThrow = true;
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

const click = (el: Element | null | undefined) =>
  act(() => {
    (el as HTMLElement).click();
  });

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    shouldThrow = false;
    const { container } = renderUi(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe("Recovered");
  });

  it("shows a generic alert with no error details by default (no PII)", () => {
    const { container } = renderUi(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    const alert = container.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("Something went wrong");
    expect(alert.textContent).toContain("Try again");
    expect(container.textContent).not.toContain("aroha");
    expect(container.textContent).not.toContain("4123");
    expect(container.innerHTML).not.toContain(SECRET);
  });

  it("recovers with Try again once the cause is gone, and calls onReset", () => {
    const onReset = vi.fn();
    const { container } = renderUi(
      <ErrorBoundary onReset={onReset}>
        <Flaky />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    click(container.querySelector("button"));
    expect(container.textContent).toBe("Recovered");
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows the fallback again if the retry fails too", () => {
    const { container } = renderUi(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    click(container.querySelector("button"));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("reports each caught error to onError with the component stack", () => {
    const onError = vi.fn();
    renderUi(
      <ErrorBoundary onError={onError}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, info] = onError.mock.calls[0] as [Error, { componentStack: string }];
    expect(error.message).toBe(SECRET);
    expect(info.componentStack).toContain("Flaky");
  });

  it("resets by itself when resetKeys change", () => {
    function Page() {
      const [id, setId] = useState(1);
      return (
        <>
          <button type="button" data-next onClick={() => setId((n) => n + 1)}>
            Next record
          </button>
          <ErrorBoundary resetKeys={[id]}>
            <Flaky />
          </ErrorBoundary>
        </>
      );
    }
    const { container } = renderUi(<Page />);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    shouldThrow = false;
    click(container.querySelector("[data-next]"));
    expect(container.textContent).toContain("Recovered");
  });

  it("renders a custom fallback, given the error and reset", () => {
    const { container } = renderUi(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <div>
            <p>{error instanceof Error ? "Error object" : "Other"}</p>
            <button type="button" onClick={reset}>
              Retry
            </button>
          </div>
        )}
      >
        <Flaky />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain("Error object");
    shouldThrow = false;
    click(container.querySelector("button"));
    expect(container.textContent).toBe("Recovered");

    shouldThrow = true;
    const plain = renderUi(
      <ErrorBoundary fallback={<p>Static fallback</p>}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(plain.container.textContent).toBe("Static fallback");
  });

  it("customises the default fallback through fallbackProps", () => {
    const { container } = renderUi(
      <ErrorBoundary fallbackProps={{ title: "Invoices couldn't load", variant: "page" }}>
        <Flaky />
      </ErrorBoundary>,
    );
    const alert = container.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("Invoices couldn't load");
    expect(alert.className).toContain("min-h-[60vh]");
  });

  it("lets framework errors through rethrow, without reporting them", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;/login" });
    const rethrow = (error: unknown) => {
      if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    };
    const onError = vi.fn();
    const outerError = vi.fn();
    const { container } = renderUi(
      <ErrorBoundary fallback={<p>Outer caught it</p>} onError={outerError}>
        <ErrorBoundary rethrow={rethrow} onError={onError}>
          <Flaky error={redirect} />
        </ErrorBoundary>
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe("Outer caught it");
    expect(onError).not.toHaveBeenCalled();
    expect(outerError).toHaveBeenCalledTimes(1);
  });

  it("still handles ordinary errors when rethrow is set", () => {
    const rethrow = vi.fn();
    const { container } = renderUi(
      <ErrorBoundary rethrow={rethrow}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(rethrow).toHaveBeenCalled();
  });

  it("passes axe with the default fallback", async () => {
    const { container } = renderUi(
      <main>
        <h1>Invoices</h1>
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>
      </main>,
    );
    await expectNoA11yViolations(container);
  });
});

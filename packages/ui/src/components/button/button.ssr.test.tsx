// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Input } from "../input/input.js";
import { Spinner } from "../spinner/spinner.js";
import { Button } from "./button.js";

// Client components still render on the server (SSR). They must not touch `window` or
// `document` while rendering, or server rendering and hydration break.
describe("Button, Input and Spinner server-render without browser globals", () => {
  it("renders a button", () => {
    const html = expectServerSafe(<Button variant="destructive">Delete</Button>);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain("Delete");
    expect(html).toContain("bg-destructive");
  });

  it("renders a loading button as busy", () => {
    const html = expectServerSafe(
      <Button loading loadingText="Saving">
        Save
      </Button>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Saving");
    expect(html).toContain("<svg");
  });

  it("renders an input", () => {
    const html = expectServerSafe(<Input aria-label="Name" defaultValue="Aroha" />);
    expect(html).toContain("<input");
    expect(html).toContain('value="Aroha"');
  });

  it("renders a spinner", () => {
    expect(expectServerSafe(<Spinner label="Loading" />)).toContain('role="status"');
  });
});

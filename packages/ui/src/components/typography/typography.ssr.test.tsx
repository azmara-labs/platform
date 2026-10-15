// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Code, Heading, Kbd, Link, Text, Typography } from "./typography.js";

describe("Typography family server-renders without browser globals", () => {
  it("renders every component", () => {
    const html = expectServerSafe(
      <main>
        <Typography variant="h1">Title</Typography>
        <Heading level={2}>Section</Heading>
        <Text tone="muted">Body</Text>
        <Link href="https://example.com" external>
          Out
        </Link>
        <Code>x</Code>
        <Kbd>Esc</Kbd>
      </main>,
    );
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("text-muted-foreground");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("<code");
    expect(html).toContain("<kbd");
  });
});

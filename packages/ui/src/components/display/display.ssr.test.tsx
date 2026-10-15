// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Alert, AlertDescription, AlertTitle } from "./alert.js";
import { Badge } from "./badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "./card.js";
import { EmptyState } from "./empty-state.js";
import { Skeleton } from "./skeleton.js";

describe("display components server-render without browser globals", () => {
  it("renders a composed screen", () => {
    const html = expectServerSafe(
      <main>
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>Try again.</AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="info">New</Badge>
            <Skeleton className="h-4 w-8" />
          </CardContent>
        </Card>
        <EmptyState title="Nothing yet" />
      </main>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("<h3");
    expect(html).toContain("animate-pulse");
    expect(html).toContain("Nothing yet");
  });
});

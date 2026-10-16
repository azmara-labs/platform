import { Code, Heading, Kbd, Link, Text } from "@azmr/ui/typography";

export default function TypographyInline() {
  return (
    <div className="flex flex-col gap-3">
      {/* The level is the document outline; the size is the look. They are separate decisions. */}
      <Heading level={2} size="h4">
        A quiet section heading
      </Heading>
      <Text>
        Press <Kbd>Enter</Kbd> to open a record, or run <Code>pnpm dev</Code> to start. Read the{" "}
        <Link href="/docs/components">components guide</Link> or visit{" "}
        <Link href="https://base-ui.com" external>
          Base UI
        </Link>
        .
      </Text>
      <Text tone="muted" size="sm">
        Muted, small text for secondary information.
      </Text>
      <Text tone="destructive" weight="medium">
        Something needs your attention.
      </Text>
    </div>
  );
}

import { AspectRatio, Container, Separator, Stack } from "@azmr/ui/layout";

export default function LayoutContainer() {
  return (
    <Container size="sm" className="rounded-md border border-dashed border-border py-4">
      <Stack gap={4}>
        <p className="text-sm">A container centres its content and limits the width.</p>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <AspectRatio ratio="video" className="rounded-md bg-muted">
            <div className="grid size-full place-items-center text-sm">16 / 9</div>
          </AspectRatio>
          <AspectRatio ratio="square" className="rounded-md bg-muted">
            <div className="grid size-full place-items-center text-sm">1 / 1</div>
          </AspectRatio>
        </div>
      </Stack>
    </Container>
  );
}

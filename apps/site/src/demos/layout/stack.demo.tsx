import { Button } from "@azmr/ui/button";
import { Separator, Stack } from "@azmr/ui/layout";

export default function LayoutStack() {
  return (
    <Stack gap={6}>
      {/* A column on phones, a row from md, with the gap following the density token. */}
      <Stack direction={{ base: "column", md: "row" }} gap="density" align="center">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="ghost">Reset</Button>
      </Stack>

      {/* A divider goes between children only. */}
      <Stack direction="row" gap={4} align="center" divider={<Separator orientation="vertical" />}>
        <span>Overview</span>
        <span>Activity</span>
        <span>Settings</span>
      </Stack>
    </Stack>
  );
}

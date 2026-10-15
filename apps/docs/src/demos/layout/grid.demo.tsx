import { Grid, GridItem } from "@azmr/ui/layout";

const cell = "rounded-md border border-border bg-muted p-4 text-sm";

export default function LayoutGrid() {
  return (
    <div className="flex flex-col gap-6">
      {/* One column on phones, two from sm, four from lg. */}
      <Grid cols={{ base: 1, sm: 2, lg: 4 }} gap={4}>
        <div className={cell}>One</div>
        <div className={cell}>Two</div>
        <div className={cell}>Three</div>
        <div className={cell}>Four</div>
      </Grid>

      {/* The 12-column pattern: cols={12} with a span per breakpoint. */}
      <Grid cols={12} gap={4}>
        <GridItem span={{ base: 12, md: 8 }} className={cell}>
          Main (12, then 8 of 12 from md)
        </GridItem>
        <GridItem span={{ base: 12, md: 4 }} className={cell}>
          Aside
        </GridItem>
      </Grid>

      {/* As many columns as fit, each at least 12rem wide. */}
      <Grid minItemWidth="12rem" gap={4}>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
        <div className={cell}>Card</div>
      </Grid>
    </div>
  );
}

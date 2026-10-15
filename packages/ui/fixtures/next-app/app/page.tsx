import { Button } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { Icon as NamedIcon } from "@azmr/ui/icons/lucide";
import { Input } from "@azmr/ui/input";
import { Grid, GridItem, Stack } from "@azmr/ui/layout";
import { cn } from "@azmr/ui/lib";
import { Spinner } from "@azmr/ui/spinner";
import { createLocale } from "@azmr/ui/theme";
import { Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

// A Server Component: it imports the server-safe entries (lib, theme) directly and renders
// client components (Button, Input, Spinner) from the package. This only builds if the
// packed package carries "use client" on its client entries and none on lib / theme.
export default function Page() {
  const nz = createLocale();
  return (
    <main className={cn("mx-auto flex max-w-xl flex-col gap-4 p-6")}>
      <h1 className="text-2xl font-semibold">@azmr/ui consumer fixture</h1>
      <p className="text-muted-foreground" data-testid="currency">
        {nz.formatCurrency(1234.5)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive" loading loadingText="Deleting">
          Delete
        </Button>
        <Button size="icon" aria-label="Busy">
          <Spinner />
        </Button>
      </div>
      <div className="flex items-center gap-3" data-testid="icons">
        {/* Server Components: stateless Icon and Spinner, with Lucide client-component icons */}
        <Icon icon={Search} aria-label="Search" size="lg" />
        <NamedIcon name="circle-alert" />
        <Spinner label="Loading customers" />
      </div>
      <Grid cols={{ base: 1, md: 3 }} gap={4} data-testid="grid">
        <GridItem span={{ base: 1 }}>A</GridItem>
        <Stack direction={{ base: "column", md: "row" }} gap="density">
          B
        </Stack>
      </Grid>
      <label htmlFor="name" className="text-sm font-medium">
        Name
      </label>
      <Input id="name" placeholder="Aroha" />
      <ThemeToggle />
    </main>
  );
}

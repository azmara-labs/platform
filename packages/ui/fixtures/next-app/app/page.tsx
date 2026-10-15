import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import { cn } from "@azmr/ui/lib";
import { Spinner } from "@azmr/ui/spinner";
import { createLocale } from "@azmr/ui/theme";
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
      <label htmlFor="name" className="text-sm font-medium">
        Name
      </label>
      <Input id="name" placeholder="Aroha" />
      <ThemeToggle />
    </main>
  );
}

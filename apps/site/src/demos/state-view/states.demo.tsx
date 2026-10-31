import { Button } from "@azmr/ui/button";
import { StateView } from "@azmr/ui/state-view";

export default function StateViewStates() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-md border">
        <StateView state="loading" title="Loading invoices…" delay={0} titleAs="h3" />
      </div>
      <div className="rounded-md border">
        <StateView
          state="empty"
          title="No invoices yet"
          description="Invoices you create appear here."
          action={<Button size="sm">Create invoice</Button>}
          titleAs="h3"
        />
      </div>
      <div className="rounded-md border">
        <StateView
          state="error"
          title="Invoices couldn't load"
          description="Check your connection and try again."
          action={
            <Button size="sm" variant="outline">
              Try again
            </Button>
          }
          titleAs="h3"
        />
      </div>
    </div>
  );
}

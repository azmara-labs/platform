import { Button } from "@/components/ui/button";

// Uses the component the shadcn CLI copied in from the azmr registry.
export default function Page() {
  return (
    <main className="flex gap-3 p-6">
      <Button>Save</Button>
      <Button variant="destructive" loading loadingText="Deleting">
        Delete
      </Button>
      <Button size="icon" aria-label="Busy" variant="outline" />
    </main>
  );
}

import { Button } from "@azmr/ui/button";

// `className` is merged last, so each class below replaces the default it conflicts with.
export default function ClassOverride() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button className="rounded-full px-8">Pill, wider</Button>
      <Button variant="outline" className="border-primary text-primary">
        Branded outline
      </Button>
      <Button className="h-14 text-base">Taller</Button>
    </div>
  );
}

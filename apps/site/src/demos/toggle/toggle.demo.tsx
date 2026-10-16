import { Toggle } from "@azmr/ui/toggle";
import { Bold, Italic } from "lucide-react";

export default function ToggleBasic() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle aria-label="Bold" size="icon">
        <Bold className="size-4" />
      </Toggle>
      <Toggle aria-label="Italic" size="icon" variant="outline" defaultPressed>
        <Italic className="size-4" />
      </Toggle>
      <Toggle variant="outline">Notify me</Toggle>
    </div>
  );
}

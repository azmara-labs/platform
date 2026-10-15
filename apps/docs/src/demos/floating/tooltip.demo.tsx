import { Button } from "@azmr/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@azmr/ui/floating";
import { Icon } from "@azmr/ui/icons";
import { Bold, Italic, Underline } from "lucide-react";

const tools = [
  { label: "Bold", icon: Bold, shortcut: "Ctrl+B" },
  { label: "Italic", icon: Italic, shortcut: "Ctrl+I" },
  { label: "Underline", icon: Underline, shortcut: "Ctrl+U" },
] as const;

export default function TooltipBasic() {
  return (
    // One provider: the first tip waits half a second, then its neighbours open at once.
    <TooltipProvider>
      <div className="flex gap-1">
        {tools.map(({ label, icon, shortcut }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <Button size="icon" variant="ghost" aria-label={label}>
                  <Icon icon={icon} />
                </Button>
              }
            />
            <TooltipContent>{shortcut}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

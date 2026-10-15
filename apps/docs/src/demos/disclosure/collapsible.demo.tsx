import { Button } from "@azmr/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@azmr/ui/disclosure";

export default function CollapsibleBasic() {
  return (
    <Collapsible className="max-w-md">
      <CollapsibleTrigger render={<Button variant="outline">Show advanced options</Button>} />
      <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
        Advanced options live here. The panel animates its height and is instant when the visitor
        prefers reduced motion.
      </CollapsibleContent>
    </Collapsible>
  );
}

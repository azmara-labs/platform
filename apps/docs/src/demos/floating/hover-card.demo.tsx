import { HoverCard, HoverCardContent, HoverCardTrigger } from "@azmr/ui/floating";

export default function HoverCardBasic() {
  return (
    <p className="max-w-md text-sm">
      The design was led by{" "}
      <HoverCard>
        <HoverCardTrigger
          href="https://platform.azmara.io/docs"
          className="font-medium underline underline-offset-4"
        >
          Aroha Ngata
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm font-medium">Aroha Ngata</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Product designer in Hamilton. Leads the design system.
          </p>
        </HoverCardContent>
      </HoverCard>
      . Hover or focus the name to preview; it is a normal link without the card.
    </p>
  );
}

import { ScrollArea } from "@azmr/ui/scroll-area";

const items = Array.from({ length: 24 }, (_, i) => `Customer ${i + 1}`);

export default function ScrollAreaBasic() {
  return (
    <div className="flex flex-col gap-6">
      {/* Tab to focus it, then the arrow keys and Page Up/Down scroll. It needs a name. */}
      <ScrollArea aria-label="Customers" className="h-48 w-64 border border-border">
        <ul className="p-3 text-sm">
          {items.map((item) => (
            <li key={item} className="border-b border-border py-2 last:border-b-0">
              {item}
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* Horizontal, with the scrollbar always visible. */}
      <ScrollArea
        aria-label="Wide table"
        orientation="horizontal"
        scrollbar="always"
        className="w-64 border border-border"
      >
        <p className="w-[40rem] whitespace-nowrap p-3 pb-5 text-sm">
          A long line of content that is wider than the area it sits in, so it scrolls sideways.
        </p>
      </ScrollArea>
    </div>
  );
}

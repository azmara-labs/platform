import { Button } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { ArrowRight, Plus, X } from "lucide-react";

export default function ButtonIcons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button startIcon={<Icon icon={Plus} />}>New customer</Button>
      <Button variant="outline" endIcon={<Icon icon={ArrowRight} />}>
        Continue
      </Button>
      {/* An icon-only button needs an accessible name; the types require it. */}
      <Button size="icon" variant="ghost" aria-label="Close">
        <Icon icon={X} />
      </Button>
      {/* Render as a link, with button styling and the right semantics. */}
      <Button
        variant="link"
        nativeButton={false}
        render={<a href="https://platform.azmara.io/docs" />}
      >
        Read the docs
      </Button>
    </div>
  );
}

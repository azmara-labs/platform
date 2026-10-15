import { Icon } from "@azmr/ui/icons";
import { Bell, LoaderCircle, Search } from "lucide-react";

export default function IconBasic() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <Icon icon={Search} size="xs" />
        <Icon icon={Search} size="sm" />
        <Icon icon={Search} size="md" />
        <Icon icon={Search} size="lg" />
        <Icon icon={Search} size="xl" />
        <Icon icon={Search} size={40} />
      </div>
      <div className="flex items-center gap-4">
        {/* Decorative by default; aria-label makes it a labelled image. */}
        <Icon icon={Bell} aria-label="Notifications" size="lg" />
        <Icon icon={Bell} size="lg" strokeWidth={1} />
        <Icon icon={Bell} size="lg" strokeWidth={2.5} />
        {/* spin keeps moving under reduced motion: a frozen loader reads as a hung page. */}
        <Icon icon={LoaderCircle} size="lg" spin aria-label="Loading" />
      </div>
    </div>
  );
}

import { IconButton } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default function IconButtonBasic() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* The label is required: it is the button's accessible name. */}
      <IconButton icon={<Icon icon={Plus} />} label="Add item" />
      <IconButton icon={<Icon icon={Pencil} />} label="Edit" variant="outline" />
      <IconButton icon={<Icon icon={Trash2} />} label="Delete" variant="destructive" />
      <IconButton
        icon={<Icon icon={Plus} />}
        label="Add item (small)"
        size="sm"
        variant="secondary"
      />
      <IconButton icon={<Icon icon={Plus} />} label="Saving" loading variant="outline" />
    </div>
  );
}

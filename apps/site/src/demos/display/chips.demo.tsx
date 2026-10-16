"use client";

import { Chip } from "@azmr/ui/display";
import { useState } from "react";

export default function DisplayChips() {
  const [tags, setTags] = useState(["React", "Accessibility", "Tailwind", "Base UI"]);

  // The Chip does not hide itself: you own the list.
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Chip
          key={tag}
          variant="secondary"
          onRemove={() => setTags((all) => all.filter((t) => t !== tag))}
        >
          {tag}
        </Chip>
      ))}
      {tags.length === 0 && <span className="text-sm text-muted-foreground">No tags left.</span>}
    </div>
  );
}

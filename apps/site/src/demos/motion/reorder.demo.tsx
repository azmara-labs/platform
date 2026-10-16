"use client";

import { IconButton } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { MotionProvider, Reorder, springs } from "@azmr/ui/motion";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";

const initial = ["Write the brief", "Design the tokens", "Build the components", "Ship the docs"];

export default function ReorderDemo() {
  const [items, setItems] = useState(initial);

  // Dragging is not available to everyone, so every move also has buttons.
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target] as string, next[index] as string];
    setItems(next);
  };

  return (
    <MotionProvider features="max">
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={setItems}
        className="flex max-w-sm flex-col gap-2"
        aria-label="Tasks, in order"
      >
        {items.map((item, index) => (
          <Reorder.Item
            key={item}
            value={item}
            transition={springs.snappy}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <Icon icon={GripVertical} className="text-muted-foreground" />
            <span className="flex-1">{item}</span>
            <IconButton
              icon={<Icon icon={ArrowUp} />}
              label={`Move "${item}" up`}
              size="sm"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            />
            <IconButton
              icon={<Icon icon={ArrowDown} />}
              label={`Move "${item}" down`}
              size="sm"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </MotionProvider>
  );
}

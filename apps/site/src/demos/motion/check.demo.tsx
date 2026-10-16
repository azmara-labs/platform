"use client";

import { Button } from "@azmr/ui/button";
import { Skeleton } from "@azmr/ui/display";
import { AnimatedCheck } from "@azmr/ui/presets";
import { useState } from "react";

export default function CheckAndShimmer() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-3">
        <AnimatedCheck key={run} size={32} className="text-success" label="Saved" />
        <span className="text-sm">Saved</span>
        <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
          Replay
        </Button>
      </div>
      <div className="flex w-72 flex-col gap-2">
        <Skeleton shimmer className="h-4 w-full" />
        <Skeleton shimmer className="h-4 w-4/5" />
        <Skeleton shimmer className="h-16 w-full" />
      </div>
    </div>
  );
}

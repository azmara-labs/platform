"use client";

import { Button } from "@azmr/ui/button";
import { motionPresets } from "@azmr/ui/presets";
import { useState } from "react";

const tiles = [
  ["Fade", motionPresets.fade.enter],
  ["Scale", motionPresets.scale.enter],
  ["Slide up", motionPresets.slideUp.enter],
  ["Slide down", motionPresets.slideDown.enter],
  ["Slide left", motionPresets.slideLeft.enter],
  ["Slide right", motionPresets.slideRight.enter],
] as const;

export default function MotionGallery() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-4">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, cls]) => (
          // The key restarts the animation each time Replay is pressed.
          <div
            key={`${label}-${run}`}
            className={`${cls} flex h-16 w-32 items-center justify-center rounded-md border border-border bg-card text-sm`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useReducedMotion } from "@azmr/ui/hooks";

export default function ReducedMotionDemo() {
  const reduced = useReducedMotion();
  return (
    <p className="text-sm" aria-live="polite">
      Your system is set to <strong>{reduced ? "reduce motion" : "allow motion"}</strong>. Change it
      in your operating system's accessibility settings and this updates without a reload.
    </p>
  );
}

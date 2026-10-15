"use client";

import { Signal } from "@azmr/core";
import { useSignal } from "@azmr/ui/hooks";

const count = new Signal(0);

export default function SignalPage() {
  const value = useSignal(count);
  return (
    <main className="p-6">
      <output data-testid="count">{value}</output>
      <button type="button" onClick={() => count.set(count.peek() + 1)}>
        increment
      </button>
    </main>
  );
}

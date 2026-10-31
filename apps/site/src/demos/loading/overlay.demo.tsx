"use client";

import { Button } from "@azmr/ui/button";
import { LoadingOverlay } from "@azmr/ui/loading/client";
import { useState } from "react";

export default function LoadingOverlayDemo() {
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Button onClick={refresh} disabled={refreshing} className="self-start">
        Refresh invoices
      </Button>
      <LoadingOverlay active={refreshing} label="Refreshing invoices" className="rounded-md border">
        <ul className="divide-y text-sm">
          <li className="flex justify-between p-3">
            <span>INV-2026-001</span>
            <span>$1,150.00</span>
          </li>
          <li className="flex justify-between p-3">
            <span>INV-2026-002</span>
            <span>$460.00</span>
          </li>
          <li className="flex justify-between p-3">
            <span>INV-2026-003</span>
            <span>$89.70</span>
          </li>
        </ul>
      </LoadingOverlay>
    </div>
  );
}

"use client";

import { Pagination } from "@azmr/ui/pagination";
import { useState } from "react";

const PAGE_SIZE = 5;
const ITEMS = Array.from({ length: 47 }, (_, i) => `Item ${i + 1}`);

// Button mode: for client state. `onPageChange` is called with the page that was chosen.
export default function PaginationState() {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(ITEMS.length / PAGE_SIZE);
  const shown = ITEMS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="flex flex-col gap-4">
      <ul className="text-sm" aria-live="polite">
        {shown.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

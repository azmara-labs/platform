"use client";

import dynamic from "next/dynamic";

// The docs' one Toaster, for the demos that raise toasts. Loaded after the page is interactive, not
// with it: every docs page carried its 8 kB gzipped before any reader could click a demo button
// (PAZM-145). The toast demos import `toast` from the same module, so they share its manager.
export const LazyToaster = dynamic(
  () => import("@azmr/ui/toast").then((module) => module.Toaster),
  { ssr: false },
);

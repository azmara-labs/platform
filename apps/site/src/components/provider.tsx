"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Loaded when someone opens search (Ctrl+K or the search button), not with the page: the landing
// page's JavaScript budget does not pay for the dialog or the search client.
const SearchDialog = dynamic(() => import("./search-dialog"), { ssr: false });

export function Provider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}

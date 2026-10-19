import "../globals.css";
import type { ReactNode } from "react";
import { Provider } from "@/components/provider";

export default function PlaygroundLayout({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}

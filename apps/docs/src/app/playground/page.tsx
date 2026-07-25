import type { Metadata } from "next";
import { App } from "./App";

export const metadata: Metadata = {
  title: "Playground — Azmara Platform",
  description: "Interactive, live demo of @azmr/core, @azmr/query, and @azmr/ui working together.",
};

export default function PlaygroundPage() {
  return <App />;
}

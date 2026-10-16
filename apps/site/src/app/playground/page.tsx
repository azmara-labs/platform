import type { Metadata } from "next";
import { App } from "./App";

const title = "Playground — Azmara Platform";
const description =
  "Interactive, live demo of @azmr/core, @azmr/query, and @azmr/ui working together.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/playground" },
  openGraph: { title, description, url: "/playground" },
  twitter: { title, description },
};

export default function PlaygroundPage() {
  return <App />;
}

import type { Metadata } from "next";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Faq } from "@/components/landing/faq";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { PackageShowcase } from "@/components/landing/package-showcase";
import { SecurityComparison } from "@/components/landing/security-comparison";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Azmara Platform — Reactive, local-first, security-first",
  description:
    "The reactive, local-first stack that treats security as architecture, not an afterthought.",
};

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <FeatureGrid />
      <SecurityComparison />
      <CodeShowcase />
      <PackageShowcase />
      <Faq />
      <CtaFooter />
      <SiteFooter />
    </main>
  );
}

import "./landing.css";
import type { Metadata } from "next";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { CtaFooter } from "@/components/landing/cta-footer";
import { DesignSystem } from "@/components/landing/design-system";
import { Faq } from "@/components/landing/faq";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { PackageShowcase } from "@/components/landing/package-showcase";
import { SecurityComparison } from "@/components/landing/security-comparison";
import { SiteFooter } from "@/components/site-footer";
import { source } from "@/lib/source";

const title = "Azmara Platform — Reactive, local-first, security-first";
const description =
  "The reactive, local-first stack that treats security as architecture, not an afterthought.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/" },
  twitter: { title, description },
};

/** The number on the design system section comes from the docs, so it cannot go stale. */
const componentCount = source
  .getPages()
  .filter((page) => page.url.startsWith("/docs/components/")).length;

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <DesignSystem componentCount={componentCount} />
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

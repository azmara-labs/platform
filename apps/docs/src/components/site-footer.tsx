import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const DOCS_LINKS = [
  { label: "Guide", href: "/docs/guide/introduction" },
  { label: "Packages", href: "/docs/packages/core" },
  { label: "Security", href: "/docs/security/overview" },
  { label: "Changelog", href: "/docs/changelog/core" },
];

const RESOURCES_LINKS = [
  { label: "GitHub", href: "https://github.com/azmara-labs/platform" },
  { label: "npm — @azmr/core", href: "https://www.npmjs.com/package/@azmr/core" },
  { label: "Azmara Labs", href: "https://www.azmara.io" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border">
      <div className="mx-auto max-w-5xl px-8 py-12">
        <div className="grid grid-cols-1 gap-8 border-b border-fd-border pb-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <BrandLogo />
            <p className="text-sm text-fd-muted-foreground">
              A TypeScript monorepo for reactive, local-first, security-first applications.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-fd-primary">
              Docs
            </h3>
            <ul className="space-y-2">
              {DOCS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-fd-primary">
              Resources
            </h3>
            <ul className="space-y-2">
              {RESOURCES_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-fd-muted-foreground">
            &copy; {new Date().getFullYear()}{" "}
            <a
              href="https://www.azmara.io"
              className="font-medium text-fd-foreground hover:text-fd-primary"
            >
              Azmara Labs
            </a>
            . All rights reserved.
          </p>
          <p className="text-xs text-fd-muted-foreground">
            Built with <span className="text-fd-primary">Next.js</span>
            {" · "}
            <span className="text-fd-primary">Fumadocs</span>
            {" · "}
            <span className="text-fd-primary">Tailwind v4</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

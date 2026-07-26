import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsFooter } from "@/components/docs-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <DocsLayout
        {...baseOptions()}
        tree={source.getPageTree()}
        sidebar={{
          footer: (
            <div key="theme-toggle-footer" className="flex justify-end">
              <ThemeToggle />
            </div>
          ),
        }}
      >
        {children}
      </DocsLayout>
      <DocsFooter />
    </>
  );
}

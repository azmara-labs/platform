import "../globals.css";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsFooter } from "@/components/docs-footer";
import { LazyToaster } from "@/components/lazy-toaster";
import { Provider } from "@/components/provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Provider>
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
      {/* One Toaster for the docs, loaded after the page: the toast demos raise toasts into it. */}
      <LazyToaster />
    </Provider>
  );
}

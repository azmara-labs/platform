import { BrandLogo } from "@/components/brand-logo";

export function DocsFooter() {
  return (
    <footer className="border-t border-fd-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-8 py-6 text-sm sm:flex-row">
        <div className="flex items-center gap-4">
          <BrandLogo className="text-xs" />
          <span className="text-fd-muted-foreground">
            &copy; {new Date().getFullYear()} Azmara Labs
          </span>
        </div>
        <a
          href="https://github.com/azmara-labs/platform"
          target="_blank"
          rel="noreferrer"
          className="text-fd-muted-foreground transition-colors hover:text-fd-primary"
        >
          <span className="sr-only">GitHub</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}

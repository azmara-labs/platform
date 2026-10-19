import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { themeScript } from "./theme-script";

// No stylesheet and no client provider here: each part of the site brings its own. The landing
// page loads the small landing.css; the docs and the playground load globals.css and the Fumadocs
// provider (theme toggle, search) in their layouts. So the landing page, the first thing most
// visitors load, does not block on the docs' CSS or download the docs' client code.

const inter = Inter({ subsets: ["latin"] });

const siteName = "Azmara Platform";
const description = "Modern data-first application runtime";
const siteUrl = "https://platform.azmara.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description,
    url: siteUrl,
    images: [{ url: "/logo-mark.png", width: 408, height: 408, alt: siteName }],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description,
    images: ["/logo-mark.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string from theme-script.ts, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

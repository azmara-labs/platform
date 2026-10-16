import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

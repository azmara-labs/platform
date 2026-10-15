import { LocaleProvider, ThemeProvider } from "@azmr/ui/react";
import {
  DENSITY_COOKIE,
  htmlAttributes,
  parseDensity,
  parseThemePreference,
  THEME_COOKIE,
} from "@azmr/ui/theme";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

// A Server Component importing the server-safe theme entry and the client providers.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const theme = parseThemePreference(jar.get(THEME_COOKIE)?.value);
  const density = parseDensity(jar.get(DENSITY_COOKIE)?.value);
  return (
    <html lang="en-NZ" {...htmlAttributes({ theme, density })}>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider defaultTheme={theme} defaultDensity={density}>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

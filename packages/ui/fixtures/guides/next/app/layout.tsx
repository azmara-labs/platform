import { ThemeProvider } from "@azmr/ui/react";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read the saved choice on the server, so the first paint is already in the right mode.
  const jar = await cookies();
  const theme = parseThemePreference(jar.get(THEME_COOKIE)?.value);
  const density = parseDensity(jar.get(DENSITY_COOKIE)?.value);

  return (
    <html lang="en-NZ" {...htmlAttributes({ theme, density })}>
      <body>
        <ThemeProvider defaultTheme={theme} defaultDensity={density}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

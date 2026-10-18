import { ThemeProvider } from "@azmr/ui/react";
import {
  DENSITY_COOKIE,
  htmlAttributes,
  parseDensity,
  parseThemePreference,
  readCookie,
  THEME_COOKIE,
} from "@azmr/ui/theme";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

// Read the saved choice on the server, so the first paint is already in the right mode.
export function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie");
  return {
    theme: parseThemePreference(readCookie(cookie, THEME_COOKIE)),
    density: parseDensity(readCookie(cookie, DENSITY_COOKIE)),
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="en-NZ" {...htmlAttributes({ theme: data?.theme, density: data?.density })}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ThemeProvider defaultTheme={loaderData.theme} defaultDensity={loaderData.density}>
      <Outlet />
    </ThemeProvider>
  );
}

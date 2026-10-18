import { ThemeProvider } from "@azmr/ui/react";
import {
  DENSITY_COOKIE,
  parseDensity,
  parseThemePreference,
  readCookie,
  THEME_COOKIE,
} from "@azmr/ui/theme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Read the choice saved by an earlier visit, so a reload keeps it.
const theme = parseThemePreference(readCookie(document.cookie, THEME_COOKIE));
const density = parseDensity(readCookie(document.cookie, DENSITY_COOKIE));

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider defaultTheme={theme} defaultDensity={density}>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

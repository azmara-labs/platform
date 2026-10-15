import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DENSITY_COOKIE,
  type Density,
  parseDensity,
  parseThemePreference,
  serializeCookie,
  THEME_COOKIE,
  type ThemePreference,
} from "../theme/preferences.js";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystem(onChange: () => void): () => void {
  const query = typeof window === "undefined" ? undefined : window.matchMedia?.(DARK_QUERY);
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const systemPrefersDark = () => window.matchMedia?.(DARK_QUERY).matches ?? false;
const serverSystemPrefersDark = () => false;

function writeCookie(name: string, value: string): void {
  // biome-ignore lint/suspicious/noDocumentCookie: the string is validated by serializeCookie, and the async Cookie Store API is not universally supported yet
  document.cookie = serializeCookie(name, value, { secure: window.location.protocol === "https:" });
}

export interface ThemeContextValue {
  /** The stored preference: `light`, `dark` or `system`. */
  theme: ThemePreference;
  /** What is actually showing: `system` resolved against the operating system. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
  density: Density;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Initial preference, normally read from the cookie on the server. Default `system`. */
  defaultTheme?: ThemePreference;
  /** Initial density, normally read from the cookie on the server. Default `comfortable`. */
  defaultDensity?: Density;
  /** Remember changes in a cookie so the server can render them next time. Default true. */
  persist?: boolean;
  /** Element that receives `data-theme` / `data-density`. Default `<html>`. */
  target?: HTMLElement;
}

/**
 * Applies `data-theme` and `data-density` to `<html>`, tracks the operating system while the
 * preference is `system`, and remembers changes in a cookie. The server should render the same
 * attributes with `htmlAttributes.fromCookies(...)` so there is no flash on first paint.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultDensity = "comfortable",
  persist = true,
  target,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    parseThemePreference(defaultTheme),
  );
  const [density, setDensityState] = useState<Density>(() => parseDensity(defaultDensity));
  const systemDark = useSyncExternalStore(
    subscribeToSystem,
    systemPrefersDark,
    serverSystemPrefersDark,
  );
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const element = target ?? document.documentElement;
    if (theme === "system") element.removeAttribute("data-theme");
    else element.setAttribute("data-theme", theme);
    if (density === "comfortable") element.removeAttribute("data-density");
    else element.setAttribute("data-density", density);
    return () => {
      element.removeAttribute("data-theme");
      element.removeAttribute("data-density");
    };
  }, [theme, density, target]);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      const safe = parseThemePreference(next);
      setThemeState(safe);
      if (persist) writeCookie(THEME_COOKIE, safe);
    },
    [persist],
  );
  const setDensity = useCallback(
    (next: Density) => {
      const safe = parseDensity(next);
      setDensityState(safe);
      if (persist) writeCookie(DENSITY_COOKIE, safe);
    },
    [persist],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, density, setDensity }),
    [theme, resolvedTheme, setTheme, density, setDensity],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a <ThemeProvider>");
  return context;
}

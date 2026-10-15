import { createContext, type ReactNode, useContext, useMemo } from "react";
import { createLocale, type Locale, type LocaleOptions } from "../theme/locale.js";

// Components work without a provider: they fall back to en-NZ / NZD.
const LocaleContext = createContext<Locale>(createLocale());

export type LocaleProviderProps = LocaleOptions & { children: ReactNode };

/** Provide locale, currency, week start, time zone and component strings to everything below. */
export function LocaleProvider({
  children,
  locale,
  currency,
  weekStartsOn,
  timeZone,
  messages,
}: LocaleProviderProps) {
  // Key on the content of `messages`, so passing a fresh object literal each render does not
  // rebuild the Intl formatters or re-render every consumer.
  const messagesKey = JSON.stringify(messages ?? {});
  const value = useMemo(
    () =>
      createLocale({
        locale,
        currency,
        weekStartsOn,
        timeZone,
        messages: JSON.parse(messagesKey) as LocaleOptions["messages"],
      }),
    [locale, currency, weekStartsOn, timeZone, messagesKey],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

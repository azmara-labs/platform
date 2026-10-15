// Server-safe. A locale bundle: validated settings, cached Intl formatters, and the
// strings components show. The default is en-NZ / NZD / Monday week start.

export interface LocaleMessages {
  close: string;
  cancel: string;
  confirm: string;
  loading: string;
  noResults: string;
  clear: string;
  search: string;
  previousPage: string;
  nextPage: string;
}

export const DEFAULT_MESSAGES: Readonly<LocaleMessages> = Object.freeze({
  close: "Close",
  cancel: "Cancel",
  confirm: "Confirm",
  loading: "Loading",
  noResults: "No results found",
  clear: "Clear",
  search: "Search",
  previousPage: "Previous page",
  nextPage: "Next page",
});

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LocaleOptions {
  /** BCP 47 tag. Default `en-NZ`. */
  locale?: string;
  /** ISO 4217 code. Default `NZD`. */
  currency?: string;
  /** 0 = Sunday ... 6 = Saturday. Default 1 (Monday). */
  weekStartsOn?: WeekStart;
  /** IANA zone used to display instants. Default: the runtime's zone. */
  timeZone?: string;
  messages?: Partial<LocaleMessages>;
}

export type DateInput = Date | number | string | null | undefined;

export interface Locale {
  readonly locale: string;
  readonly currency: string;
  readonly weekStartsOn: WeekStart;
  readonly timeZone: string | undefined;
  readonly messages: LocaleMessages;
  formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions): string;
  formatCurrency(value: number | null | undefined, options?: Intl.NumberFormatOptions): string;
  /** Date-only strings (`2026-10-15`) print that calendar day in every time zone. */
  formatDate(value: DateInput, options?: Intl.DateTimeFormatOptions): string;
  formatDateTime(value: DateInput, options?: Intl.DateTimeFormatOptions): string;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const FIELD_OPTIONS = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeZoneName",
] as const;

/** Resolve an input to an instant; date-only strings become UTC midnight and flag `calendarDay`. */
function toInstant(value: DateInput): { date: Date; calendarDay: boolean } | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) {
      const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      return Number.isNaN(date.getTime()) ? undefined : { date, calendarDay: true };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : { date, calendarDay: false };
}

export function createLocale(options: LocaleOptions = {}): Locale {
  const locale = options.locale ?? "en-NZ";
  const currency = options.currency ?? "NZD";
  const weekStartsOn = options.weekStartsOn ?? 1;
  const timeZone = options.timeZone;

  try {
    Intl.getCanonicalLocales(locale);
  } catch {
    throw new Error(`createLocale: invalid locale ${JSON.stringify(locale)}`);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      `createLocale: currency must be an ISO 4217 code like "NZD", got ${JSON.stringify(currency)}`,
    );
  }
  if (timeZone !== undefined) {
    try {
      new Intl.DateTimeFormat(locale, { timeZone });
    } catch {
      throw new Error(`createLocale: unknown time zone ${JSON.stringify(timeZone)}`);
    }
  }
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error(
      `createLocale: weekStartsOn must be an integer from 0 to 6, got ${weekStartsOn}`,
    );
  }

  const numberFormats = new Map<string, Intl.NumberFormat>();
  const dateFormats = new Map<string, Intl.DateTimeFormat>();
  const numberFormat = (opts: Intl.NumberFormatOptions) => {
    const key = JSON.stringify(opts);
    let format = numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(locale, opts);
      numberFormats.set(key, format);
    }
    return format;
  };
  const dateFormat = (opts: Intl.DateTimeFormatOptions) => {
    const key = JSON.stringify(opts);
    let format = dateFormats.get(key);
    if (!format) {
      format = new Intl.DateTimeFormat(locale, opts);
      dateFormats.set(key, format);
    }
    return format;
  };

  const formatDateWith =
    (defaults: Intl.DateTimeFormatOptions) =>
    (value: DateInput, opts: Intl.DateTimeFormatOptions = {}) => {
      const instant = toInstant(value);
      if (!instant) return "";
      // A calendar day is formatted in UTC so it can never slide to a neighbouring day.
      const zone = instant.calendarDay ? "UTC" : (opts.timeZone ?? timeZone);
      // Intl rejects dateStyle/timeStyle combined with individual fields, so the defaults
      // only apply when the caller has not asked for specific fields or a style of their own.
      const customised =
        FIELD_OPTIONS.some((key) => key in opts) || "dateStyle" in opts || "timeStyle" in opts;
      return dateFormat({
        ...(customised ? {} : defaults),
        ...opts,
        ...(zone ? { timeZone: zone } : {}),
      }).format(instant.date);
    };

  const isNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  return {
    locale,
    currency,
    weekStartsOn: weekStartsOn as WeekStart,
    timeZone,
    messages: { ...DEFAULT_MESSAGES, ...options.messages },
    formatNumber: (value, opts = {}) => (isNumber(value) ? numberFormat(opts).format(value) : ""),
    formatCurrency: (value, opts = {}) =>
      isNumber(value) ? numberFormat({ style: "currency", currency, ...opts }).format(value) : "",
    formatDate: formatDateWith({ dateStyle: "medium" }),
    formatDateTime: formatDateWith({ dateStyle: "medium", timeStyle: "short" }),
  };
}

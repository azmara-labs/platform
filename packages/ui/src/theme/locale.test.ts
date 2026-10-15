import { describe, expect, it } from "vitest";
import { createLocale, DEFAULT_MESSAGES } from "./locale.js";

describe("createLocale defaults (en-NZ)", () => {
  const nz = createLocale();

  it("defaults to en-NZ, NZD and a Monday week start", () => {
    expect(nz.locale).toBe("en-NZ");
    expect(nz.currency).toBe("NZD");
    expect(nz.weekStartsOn).toBe(1);
  });

  it("formats currency and numbers the NZ way", () => {
    expect(nz.formatCurrency(1234.5)).toBe("$1,234.50");
    expect(nz.formatCurrency(-5)).toMatch(/-\$5\.00|\$-5\.00|−\$5\.00/);
    expect(nz.formatNumber(1234567.891, { maximumFractionDigits: 1 })).toBe("1,234,567.9");
    expect(nz.formatNumber(0.256, { style: "percent" })).toBe("26%");
  });

  it("formats dates in day-month-year order", () => {
    expect(nz.formatDate(new Date(Date.UTC(2026, 9, 15, 12)), { timeZone: "UTC" })).toBe(
      "15 Oct 2026",
    );
  });

  it("returns an empty string for missing or invalid values instead of throwing", () => {
    for (const bad of [null, undefined, "", "not a date", Number.NaN, new Date("nope")]) {
      expect(nz.formatDate(bad as never), String(bad)).toBe("");
      expect(nz.formatDateTime(bad as never), String(bad)).toBe("");
    }
    expect(nz.formatNumber(null as never)).toBe("");
    expect(nz.formatCurrency(undefined as never)).toBe("");
  });
});

describe("custom date fields", () => {
  const nz = createLocale({ timeZone: "UTC" });
  const day = new Date(Date.UTC(2026, 9, 15, 12));

  it("accepts individual fields without tripping over the default dateStyle", () => {
    expect(nz.formatDate(day, { month: "long", year: "numeric" })).toBe("October 2026");
    expect(nz.formatDate(day, { weekday: "long" })).toBe("Thursday");
  });

  it("accepts an explicit dateStyle override", () => {
    expect(nz.formatDate(day, { dateStyle: "full" })).toContain("Thursday");
  });

  it("applies the same rule to date-times", () => {
    expect(nz.formatDateTime(day, { hour: "2-digit", minute: "2-digit", hour12: false })).toMatch(
      /12:00/,
    );
  });
});

describe("date-only strings never shift across time zones", () => {
  for (const timeZone of ["Pacific/Auckland", "America/Los_Angeles", "UTC", "Pacific/Kiritimati"]) {
    it(`2026-10-15 stays 15 Oct 2026 in ${timeZone}`, () => {
      const locale = createLocale({ timeZone });
      expect(locale.formatDate("2026-10-15")).toBe("15 Oct 2026");
    });
  }
});

describe("instants honour the configured time zone", () => {
  const instant = new Date("2026-10-14T22:00:00Z"); // 11:00 on 15 Oct in Auckland (NZDT, UTC+13)

  it("shows the Auckland calendar day", () => {
    const auckland = createLocale({ timeZone: "Pacific/Auckland" });
    expect(auckland.formatDate(instant)).toBe("15 Oct 2026");
    expect(auckland.formatDateTime(instant)).toContain("15 Oct 2026");
    expect(auckland.formatDateTime(instant)).toContain("11:00");
  });

  it("shows the previous day in UTC", () => {
    expect(createLocale({ timeZone: "UTC" }).formatDate(instant)).toBe("14 Oct 2026");
  });

  it("lets a call override the zone", () => {
    const utc = createLocale({ timeZone: "UTC" });
    expect(utc.formatDate(instant, { timeZone: "Pacific/Auckland" })).toBe("15 Oct 2026");
  });
});

describe("other locales", () => {
  it("formats German euros", () => {
    const de = createLocale({ locale: "de-DE", currency: "EUR" });
    expect(de.formatCurrency(1234.5)).toContain("1.234,50");
    expect(de.weekStartsOn).toBe(1);
  });

  it("lets the week start be set explicitly (US Sunday)", () => {
    expect(createLocale({ locale: "en-US", currency: "USD", weekStartsOn: 0 }).weekStartsOn).toBe(
      0,
    );
  });
});

describe("messages", () => {
  it("ships English defaults for the strings components need", () => {
    for (const key of [
      "close",
      "cancel",
      "confirm",
      "loading",
      "noResults",
      "clear",
      "search",
      "previousPage",
      "nextPage",
    ] as const) {
      expect(DEFAULT_MESSAGES[key], key).toBeTruthy();
    }
  });

  it("merges overrides over the defaults", () => {
    const mi = createLocale({ messages: { close: "Kati" } });
    expect(mi.messages.close).toBe("Kati");
    expect(mi.messages.cancel).toBe(DEFAULT_MESSAGES.cancel);
  });

  it("does not mutate the shared defaults", () => {
    createLocale({ messages: { close: "X" } });
    expect(DEFAULT_MESSAGES.close).not.toBe("X");
  });
});

describe("validation", () => {
  it("rejects a malformed locale tag", () => {
    expect(() => createLocale({ locale: "not a locale!!" })).toThrow(/locale/i);
  });

  it("rejects a currency that is not a 3-letter ISO code", () => {
    for (const currency of ["dollars", "nz", "NZ1", "nzd"]) {
      expect(() => createLocale({ currency }), currency).toThrow(/currency/i);
    }
  });

  it("rejects an unknown time zone", () => {
    expect(() => createLocale({ timeZone: "Mars/Olympus_Mons" })).toThrow(/time zone/i);
  });

  it("rejects a week start outside 0-6", () => {
    for (const weekStartsOn of [7, -1, 1.5, Number.NaN]) {
      expect(
        () => createLocale({ weekStartsOn: weekStartsOn as never }),
        String(weekStartsOn),
      ).toThrow(/weekStartsOn/);
    }
  });
});

describe("formatter reuse", () => {
  it("returns identical output across repeated calls (cached Intl instances)", () => {
    const nz = createLocale();
    const first = nz.formatCurrency(10);
    for (let i = 0; i < 100; i++) expect(nz.formatCurrency(10)).toBe(first);
  });
});

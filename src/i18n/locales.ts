/**
 * THE language config — the single source of truth.
 *
 * Adding a language to the site is ONE line here:
 *   1. Routing (`/xx/...`) starts working immediately.
 *   2. The language switcher shows the new entry.
 *   3. Admin saves translate content into it via LLM.
 *   4. The backfill task translates existing content.
 *   5. `npm run i18n:sync` generates the missing UI dictionary.
 */
export const locales = {
  en: { label: 'English' },
} as const satisfies Record<string, { label: string }>;

export type Locale = keyof typeof locales;

export const localeCodes = Object.keys(locales) as Locale[];

/** The language the admin writes content in; also the routing default. */
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return value in locales;
}

/**
 * Reads a per-locale content map ({ en: "...", it: "..." }) with fallback
 * to the default locale, so a freshly added language never breaks a page.
 */
export function pickLocalized(
  map: Partial<Record<Locale, string>> | Map<string, string> | undefined | null,
  locale: Locale,
): string {
  if (!map) return '';
  const get = (key: Locale) =>
    map instanceof Map ? map.get(key) : (map as Partial<Record<Locale, string>>)[key];
  return get(locale) || get(defaultLocale) || '';
}

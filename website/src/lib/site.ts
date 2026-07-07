import { locales } from "@/i18n/routing";

export const GITHUB_URL = "https://github.com/melihaycicek/form-human-guard";
export const NPM_URL = "https://www.npmjs.com/package/form-human-guard";

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function localePath(locale: string, path: string): string {
  const suffix = path === "/" ? "" : path;
  return locale === "en" ? suffix || "/" : `/${locale}${suffix}`;
}

/** hreflang alternates for a route, x-default pointing at English. */
export function buildLanguageAlternates(path: string): Record<string, string> {
  const base = getSiteUrl();
  const entries: Record<string, string> = {};
  for (const locale of locales) {
    entries[locale] = `${base}${localePath(locale, path)}`;
  }
  entries["x-default"] = `${base}${localePath("en", path)}`;
  return entries;
}

export function canonicalUrl(locale: string, path: string): string {
  return `${getSiteUrl()}${localePath(locale, path)}`;
}

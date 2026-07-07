import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for the locale list. Adding a locale later is this
 * line plus a messages/<locale>.json file.
 */
export const locales = ["en", "zh-CN", "es", "hi"] as const;

export type AppLocale = (typeof locales)[number];

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  es: "Español",
  hi: "हिन्दी",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Persist an explicit choice so it wins over Accept-Language detection.
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
});

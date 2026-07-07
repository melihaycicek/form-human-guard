"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";

/**
 * Switches locale while preserving the current path. The next-intl proxy
 * persists the choice in a cookie, so it wins over Accept-Language next time.
 */
export function LocaleSwitcher({ id }: { id: string }) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(() => {
      router.replace(
        // Pass current dynamic params (e.g. docs slug) through unchanged.
        // @ts-expect-error -- pathname + params match the active route
        { pathname, params },
        { locale: next as AppLocale }
      );
    });
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-muted">
      <span className="sr-only">{t("label")}</span>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <select
        id={id}
        value={locale}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
        className="cursor-pointer rounded-lg border border-edge bg-card px-2 py-1.5 text-sm text-foreground"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

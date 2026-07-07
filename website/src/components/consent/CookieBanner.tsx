"use client";

import { useTranslations } from "next-intl";
import { useConsent } from "./ConsentProvider";

export function CookieBanner() {
  const t = useTranslations("cookie");
  const { bannerOpen, setConsent } = useConsent();

  if (!bannerOpen) return null;

  return (
    <div
      role="region"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-card/95 backdrop-blur px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted max-w-2xl">{t("message")}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent("necessary")}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            {t("necessaryOnly")}
          </button>
          <button
            type="button"
            onClick={() => setConsent("all")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:opacity-90"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

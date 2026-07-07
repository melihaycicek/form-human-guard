import { useTranslations } from "next-intl";

/**
 * The §"what this is and isn't" disclaimer, deliberately placed right after
 * the hero. The honesty IS the brand.
 */
export function HonestyStrip() {
  const t = useTranslations("honesty");

  const isItems = [t("is1"), t("is2"), t("is3")];
  const isntItems = [t("isnt1"), t("isnt2"), t("isnt3")];

  return (
    <section aria-labelledby="honesty-heading" className="border-y border-edge bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="honesty-heading" className="text-2xl font-bold tracking-tight">
          {t("heading")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          {t("statement")}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-card p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ok">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {t("isTitle")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {isItems.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-edge bg-card p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bad">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              {t("isntTitle")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {isntItems.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bad" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

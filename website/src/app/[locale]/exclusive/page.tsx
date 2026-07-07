import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WaitlistForm } from "@/components/exclusive/WaitlistForm";
import { ArrowMark } from "@/components/site/ArrowMark";
import { buildLanguageAlternates, canonicalUrl } from "@/lib/site";

const FAQ_KEYS = ["free", "price", "when", "selfhost", "captcha"] as const;

const TIERS = [
  {
    key: "free",
    features: ["f1", "f2", "f3", "f4", "f5"],
    planned: false,
  },
  {
    key: "pro",
    features: ["f1", "f2", "f3", "f4", "f5"],
    planned: true,
  },
  {
    key: "enterprise",
    features: ["f1", "f2", "f3", "f4", "f5"],
    planned: true,
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exclusive.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: canonicalUrl(locale, "/exclusive"),
      languages: buildLanguageAlternates("/exclusive"),
    },
  };
}

export default async function ExclusivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("exclusive");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {/* Positioning header */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warn">
          {t("plannedBadge")}
        </p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{t("heading")}</h1>
        <p className="mt-5 text-lg text-muted">{t("lead")}</p>
        <p className="mx-auto mt-6 max-w-2xl rounded-2xl border border-edge bg-surface/60 p-4 text-sm text-muted">
          {t("openCorePromise")}
        </p>
      </header>

      {/* Tier cards */}
      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`flex flex-col rounded-2xl border bg-card p-6 sm:p-7 ${
              tier.key === "pro" ? "border-accent shadow-lg shadow-accent/10" : "border-edge"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t(`tiers.${tier.key}.name`)}</h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  tier.planned
                    ? "border-warn/40 bg-warn/10 text-warn"
                    : "border-ok/40 bg-ok/10 text-ok"
                }`}
              >
                {tier.planned ? t("plannedTierBadge") : t("availableTierBadge")}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{t(`tiers.${tier.key}.blurb`)}</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm">
                  <ArrowMark size={15} className="mt-0.5 shrink-0 text-accent" />
                  {t(`tiers.${tier.key}.${feature}`)}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-edge pt-4 text-xs text-muted">
              {tier.planned ? t("noPriceNote") : t("freeNote")}
            </p>
          </div>
        ))}
      </div>

      {/* Honesty applies here too */}
      <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted">{t("honestyNote")}</p>

      {/* Waitlist */}
      <div id="waitlist" className="mx-auto mt-16 max-w-2xl scroll-mt-24">
        <WaitlistForm />
      </div>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto mt-20 max-w-3xl">
        <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">
          {t("faq.heading")}
        </h2>
        <div className="mt-6 divide-y divide-edge rounded-2xl border border-edge bg-card">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {t(`faq.${key}.q`)}
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t(`faq.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";

const TIER_KEYS = ["free", "pro", "enterprise"] as const;

export function ExclusiveTeaser() {
  const t = useTranslations("teaser");

  return (
    <section aria-labelledby="teaser-heading" className="border-t border-edge bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading kicker={t("kicker")} title={t("heading")} lead={t("lead")} id="teaser-heading" />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TIER_KEYS.map((tier) => (
            <div key={tier} className="flex flex-col rounded-2xl border border-edge bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{t(`tiers.${tier}.name`)}</h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    tier === "free"
                      ? "border-ok/40 bg-ok/10 text-ok"
                      : "border-warn/40 bg-warn/10 text-warn"
                  }`}
                >
                  {tier === "free" ? t("availableBadge") : t("plannedBadge")}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted">{t(`tiers.${tier}.blurb`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/exclusive"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02]"
          >
            {t("cta")}
          </Link>
          <p className="text-sm text-muted">{t("promise")}</p>
        </div>
      </div>
    </section>
  );
}

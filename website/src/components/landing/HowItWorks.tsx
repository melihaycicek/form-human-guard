"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEP_KEYS = ["challenge", "interact", "verify", "token", "consume"] as const;
const CARD_KEYS = ["timing", "binding", "oneTime"] as const;

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], React.ReactNode> = {
  challenge: <path d="M12 3v18m0-18-4 4m4-4 4 4" />,
  interact: <path d="M9 11.5 4 16.5m11-11L9.5 11m5.5-5.5 4.5 4.5M7 21a4 4 0 0 1-4-4c0-1.1.9-2 2-2s2 .9 2 2" />,
  verify: <path d="M20 6 9 17l-5-5" />,
  token: <path d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.7 5.7L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.6a1 1 0 0 1 .3-.7l5.9-6A6 6 0 1 1 21 9Z" />,
  consume: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />,
};

const CARD_ICONS: Record<(typeof CARD_KEYS)[number], React.ReactNode> = {
  timing: <path d="M12 8v4l2.5 2.5M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" />,
  binding: <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />,
  oneTime: <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-2.9-7.1-2.8 2.8m-8.6 8.6-2.8 2.8m0-14.2 2.8 2.8m8.6 8.6 2.8 2.8" />,
};

export function HowItWorks() {
  const t = useTranslations("how");
  const reduced = useReducedMotion();

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-edge">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading kicker={t("kicker")} title={t("heading")} lead={t("lead")} id="how-heading" />

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEP_KEYS.map((key, index) => (
            <motion.li
              key={key}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.12 }}
              className="relative rounded-2xl border border-edge bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {STEP_ICONS[key]}
                  </svg>
                </span>
                <span className="font-mono text-xs text-muted">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{t(`steps.${key}.title`)}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(`steps.${key}.desc`)}</p>
              {index < STEP_KEYS.length - 1 && (
                <span aria-hidden="true" className="absolute -right-3.5 top-1/2 hidden -translate-y-1/2 text-accent lg:block">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </span>
              )}
            </motion.li>
          ))}
        </ol>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CARD_KEYS.map((key, index) => (
            <motion.div
              key={key}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.1 }}
              className="rounded-2xl border border-edge bg-surface/60 p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {CARD_ICONS[key]}
                </svg>
              </span>
              <h3 className="mt-4 font-semibold">{t(`cards.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`cards.${key}.desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

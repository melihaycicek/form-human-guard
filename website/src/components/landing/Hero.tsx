"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CopyButton } from "@/components/ui/CopyButton";

const DIRECTIONS = [45, 90, 180, 270, 315, 0, 135, 225];

/** Decorative compass: ambient arrow rotating through the 8 directions. */
function HeroCompass() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % DIRECTIONS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [reduced]);

  const rotation = DIRECTIONS[index]!;

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-md select-none">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="96" className="stroke-edge" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="72" className="stroke-edge" strokeWidth="1" fill="none" strokeDasharray="2 5" />
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4;
          const x = 100 + Math.sin(angle) * 86;
          const y = 100 - Math.cos(angle) * 86;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === index % 8 ? 5 : 3}
              className={i === index % 8 ? "fill-accent" : "fill-edge"}
              style={{ transition: "r 300ms ease, fill 300ms ease" }}
            />
          );
        })}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100px 100px",
            transition: reduced ? undefined : "transform 700ms cubic-bezier(0.34, 1.3, 0.64, 1)",
          }}
        >
          <path
            d="M100 52 L100 138 M100 52 L78 78 M100 52 L122 78"
            className="stroke-accent"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        <circle cx="100" cy="100" r="10" className="fill-background stroke-accent" strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 -z-10 rounded-full bg-accent-soft blur-3xl" />
    </div>
  );
}

export function Hero() {
  const t = useTranslations("hero");
  const reduced = useReducedMotion();
  const installCommand = "npm install form-human-guard";

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid mask-fade-b absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-24">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {t("badge")}
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {t("tagline")}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t("sub")}</p>

          <div className="mt-8 flex max-w-md items-center gap-2 rounded-xl border border-edge bg-card px-4 py-3 font-mono text-sm shadow-sm">
            <span aria-hidden="true" className="select-none text-accent">
              $
            </span>
            <code className="flex-1 overflow-x-auto whitespace-nowrap">{installCommand}</code>
            <CopyButton text={installCommand} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02]"
            >
              {t("ctaDemo")}
            </a>
            <Link
              href="/docs"
              className="rounded-xl border border-edge bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface"
            >
              {t("ctaDocs")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="hidden lg:block"
        >
          <HeroCompass />
        </motion.div>
      </div>
    </section>
  );
}

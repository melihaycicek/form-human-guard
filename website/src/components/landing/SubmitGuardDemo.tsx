"use client";

import { useState } from "react";
import { SubmitGuard, guardThemePresets } from "form-human-guard/react";
import type { GuardThemePreset } from "form-human-guard/react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

const PRESETS = Object.keys(guardThemePresets) as GuardThemePreset[];

interface SubmitResult {
  status: number;
  body: unknown;
}

/**
 * Live SubmitGuard demo: a fake "create account" form whose submit is
 * intercepted by the invisible guard. Includes the theme gallery, an accent
 * override picker, and a deliberate "reuse the token" button that shows the
 * one-time guarantee failing loudly (401).
 */
export function SubmitGuardDemo() {
  const t = useTranslations("demoSubmit");
  const { resolvedTheme } = useTheme();

  // null = follow the site theme (§9 mapping: dark → midnight, light → light).
  const [preset, setPreset] = useState<GuardThemePreset | null>(null);
  const [accent, setAccent] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [reuseResult, setReuseResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  const activePreset: GuardThemePreset =
    preset ?? (resolvedTheme === "dark" ? "midnight" : "light");

  async function consume(token: string): Promise<SubmitResult> {
    const response = await fetch("/api/demo/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guardToken: token }),
    });
    return { status: response.status, body: await response.json() };
  }

  // Runs only after SubmitGuard has intercepted the first submit, the user
  // solved the overlay challenge, and the guard re-submitted with the token.
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("guardToken") ?? "");
    if (!token) return;
    setBusy(true);
    setReuseResult(null);
    try {
      setSubmitResult(await consume(token));
      setLastToken(token);
    } finally {
      setBusy(false);
    }
  }

  async function reuse() {
    if (!lastToken) return;
    setBusy(true);
    try {
      setReuseResult(await consume(lastToken));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="demo-submit" aria-labelledby="demo-submit-heading" className="border-t border-edge bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          kicker={t("kicker")}
          title={t("heading")}
          lead={t("lead")}
          id="demo-submit-heading"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Theme gallery */}
          <div className="rounded-2xl border border-edge bg-card p-6">
            <h3 className="text-sm font-semibold">{t("themeLabel")}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPreset(null)}
                aria-pressed={preset === null}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                  preset === null ? "border-accent ring-1 ring-accent" : "border-edge hover:border-muted"
                }`}
              >
                <span className="mb-2 flex gap-1">
                  <span className="h-4 w-4 rounded-full border border-edge bg-[#f8fafc]" />
                  <span className="h-4 w-4 rounded-full border border-edge bg-[#111631]" />
                </span>
                {t("followSite")}
              </button>
              {PRESETS.map((name) => {
                const swatch = guardThemePresets[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPreset(name)}
                    aria-pressed={preset === name}
                    className={`rounded-xl border p-3 text-left text-sm capitalize transition-colors ${
                      preset === name ? "border-accent ring-1 ring-accent" : "border-edge hover:border-muted"
                    }`}
                  >
                    <span className="mb-2 flex gap-1">
                      <span className="h-4 w-4 rounded-full border border-edge" style={{ background: swatch.surface }} />
                      <span className="h-4 w-4 rounded-full border border-edge" style={{ background: swatch.accent }} />
                    </span>
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-edge pt-5">
              <label htmlFor="accent-override" className="text-sm text-muted">
                {t("accentLabel")}
              </label>
              <input
                id="accent-override"
                type="color"
                value={accent ?? guardThemePresets[activePreset].accent}
                onChange={(event) => setAccent(event.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-edge bg-card"
              />
              {accent && (
                <button
                  type="button"
                  onClick={() => setAccent(null)}
                  className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
                >
                  {t("clearAccent")}
                </button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">{t("shadowNote")}</p>
          </div>

          {/* Fake create-account form, actually protected */}
          <div className="rounded-2xl border border-edge bg-card p-6">
            <h3 className="text-sm font-semibold">{t("formTitle")}</h3>
            <p className="mt-1 text-xs text-muted">{t("fakeNote")}</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="demo-name" className="mb-1 block text-sm text-muted">
                  {t("username")}
                </label>
                <input
                  id="demo-name"
                  name="username"
                  autoComplete="off"
                  defaultValue="ada"
                  className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="demo-email" className="mb-1 block text-sm text-muted">
                  {t("email")}
                </label>
                <input
                  id="demo-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  defaultValue="ada@example.com"
                  className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm"
                />
              </div>
              <SubmitGuard
                endpoint="/api/guard/demo"
                theme={activePreset}
                themeOverrides={accent ? { accent } : undefined}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t("submit")}
              </button>
              <p className="text-xs text-muted">{t("interceptNote")}</p>
            </form>

            <div aria-live="polite">
              {submitResult && (
                <div className="mt-4 rounded-xl border border-edge bg-surface p-4">
                  <p className={`text-sm font-semibold ${submitResult.status === 200 ? "text-ok" : "text-bad"}`}>
                    {submitResult.status === 200 ? t("consumedTitle") : t("failedTitle")}{" "}
                    <span className="font-mono">HTTP {submitResult.status}</span>
                  </p>
                  <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-muted">
                    {JSON.stringify(submitResult.body, null, 2)}
                  </pre>
                  {lastToken && submitResult.status === 200 && (
                    <button
                      type="button"
                      onClick={reuse}
                      disabled={busy}
                      className="mt-3 rounded-lg border border-edge bg-card px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
                    >
                      {t("tryReuse")}
                    </button>
                  )}
                </div>
              )}
              {reuseResult && (
                <div className="mt-3 rounded-xl border border-bad/40 bg-bad/10 p-4">
                  <p className="text-sm font-semibold text-bad">
                    {t("reuseRejected")} <span className="font-mono">HTTP {reuseResult.status}</span>
                  </p>
                  <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-muted">
                    {JSON.stringify(reuseResult.body, null, 2)}
                  </pre>
                  <p className="mt-2 text-xs text-muted">{t("reuseExplain")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

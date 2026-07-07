"use client";

import { useState } from "react";
import { SubmitGuard } from "form-human-guard/react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { ArrowMark } from "@/components/site/ArrowMark";

type Status = "idle" | "busy" | "success" | "error";

/**
 * Dogfooding: this real newsletter form is protected by SubmitGuard with
 * action "newsletter" — a token from the demo section is rejected here.
 */
export function NewsletterSection() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string>("genericError");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guardToken = String(form.get("guardToken") ?? "");
    if (!guardToken) return; // guard not solved yet — it will re-submit

    setStatus("busy");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          consent: form.get("consent") === "on",
          guardToken,
          locale,
        }),
      });
      if (response.ok) {
        setStatus("success");
        return;
      }
      const body = (await response.json()) as { code?: string };
      setErrorKey(
        body.code === "INVALID_EMAIL"
          ? "invalidEmail"
          : body.code === "CONSENT_REQUIRED"
            ? "consentRequired"
            : response.status === 429
              ? "rateLimited"
              : "genericError"
      );
      setStatus("error");
    } catch {
      setErrorKey("genericError");
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="newsletter-heading" className="border-t border-edge">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <ArrowMark size={36} className="mx-auto text-accent" />
        <h2 id="newsletter-heading" className="mt-4 text-3xl font-bold tracking-tight">
          {t("heading")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">{t("lead")}</p>

        {status === "success" ? (
          <div role="status" className="mx-auto mt-8 max-w-md rounded-2xl border border-ok/40 bg-ok/10 p-6">
            <p className="font-semibold text-ok">{t("success")}</p>
            <p className="mt-1 text-sm text-muted">{t("successNote")}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-md text-left">
            <label htmlFor="newsletter-email" className="sr-only">
              {t("emailLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                placeholder={t("emailPlaceholder")}
                className="w-full rounded-xl border border-edge bg-card px-4 py-3 text-sm"
              />
              <SubmitGuard
                endpoint="/api/guard/newsletter"
                theme={resolvedTheme === "dark" ? "midnight" : "light"}
              />
              <button
                type="submit"
                disabled={status === "busy"}
                className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-50"
              >
                {t("submit")}
              </button>
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-muted">
              <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--accent)]" />
              {t("consentLabel")}
            </label>
            {status === "error" && (
              <p role="alert" className="mt-3 text-sm text-bad">
                {t(errorKey)}
              </p>
            )}
            <p className="mt-4 rounded-xl border border-dashed border-edge bg-surface/60 p-3 text-xs text-muted">
              {t("protectedNote")}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

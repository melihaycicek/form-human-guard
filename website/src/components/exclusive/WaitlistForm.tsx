"use client";

import { useState } from "react";
import { SubmitGuard } from "form-human-guard/react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Status = "idle" | "busy" | "success" | "error";

const TIERS = ["pro", "enterprise", "curious"] as const;

/** The conversion goal of /exclusive — protected by the guard itself. */
export function WaitlistForm() {
  const t = useTranslations("exclusive.waitlist");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState("genericError");
  const [note, setNote] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guardToken = String(form.get("guardToken") ?? "");
    if (!guardToken) return;

    setStatus("busy");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          tier: form.get("tier"),
          note: note || undefined,
          locale,
          guardToken,
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

  if (status === "success") {
    return (
      <div role="status" className="rounded-2xl border border-ok/40 bg-ok/10 p-8 text-center">
        <p className="text-lg font-semibold text-ok">{t("success")}</p>
        <p className="mt-2 text-sm text-muted">{t("successNote")}</p>
        <Link
          href="/#demo"
          className="mt-4 inline-block rounded-xl border border-edge bg-card px-5 py-2.5 text-sm font-semibold hover:bg-surface"
        >
          {t("backToDemo")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-edge bg-card p-6 sm:p-8">
      <h3 className="text-lg font-semibold">{t("heading")}</h3>
      <p className="mt-1 text-sm text-muted">{t("lead")}</p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="waitlist-email" className="mb-1.5 block text-sm font-medium">
            {t("emailLabel")}
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("tierLabel")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {TIERS.map((tier, index) => (
              <label
                key={tier}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-edge bg-surface px-4 py-3 text-sm has-checked:border-accent has-checked:ring-1 has-checked:ring-accent"
              >
                <input
                  type="radio"
                  name="tier"
                  value={tier}
                  defaultChecked={index === 0}
                  className="accent-[var(--accent)]"
                />
                {t(`tiers.${tier}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="waitlist-note" className="mb-1.5 block text-sm font-medium">
            {t("noteLabel")}{" "}
            <span className="font-normal text-muted">{t("noteOptional")}</span>
          </label>
          <textarea
            id="waitlist-note"
            maxLength={200}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            className="w-full resize-none rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm"
          />
          <p className="mt-1 text-right font-mono text-xs text-muted">{note.length}/200</p>
        </div>

        <SubmitGuard
          endpoint="/api/guard/waitlist"
          theme={resolvedTheme === "dark" ? "midnight" : "light"}
        />

        <button
          type="submit"
          disabled={status === "busy"}
          className="w-full rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-50"
        >
          {t("submit")}
        </button>

        {status === "error" && (
          <p role="alert" className="text-sm text-bad">
            {t(errorKey)}
          </p>
        )}
        <p className="text-xs text-muted">{t("protectedNote")}</p>
      </div>
    </form>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GITHUB_URL, NPM_URL } from "@/lib/site";
import { useConsent } from "@/components/consent/ConsentProvider";
import { ArrowMark } from "./ArrowMark";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Footer() {
  const t = useTranslations("footer");
  const { reopen } = useConsent();

  return (
    <footer className="border-t border-edge bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 font-semibold">
              <ArrowMark size={24} className="text-accent" />
              <span>form-human-guard</span>
            </div>
            <p className="mt-3 text-sm text-muted">{t("disclaimer")}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <nav aria-label={t("productHeading")}>
              <h2 className="text-sm font-semibold">{t("productHeading")}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>
                  <Link href="/#demo" className="hover:text-foreground">
                    {t("demo")}
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-foreground">
                    {t("docs")}
                  </Link>
                </li>
                <li>
                  <Link href="/exclusive" className="hover:text-foreground">
                    {t("exclusive")}
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-label={t("resourcesHeading")}>
              <h2 className="text-sm font-semibold">{t("resourcesHeading")}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>
                  <a href={NPM_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
                    npm
                  </a>
                </li>
                <li>
                  <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}/blob/main/LICENSE`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    {t("license")}
                  </a>
                </li>
              </ul>
            </nav>
            <div>
              <h2 className="text-sm font-semibold">{t("preferencesHeading")}</h2>
              <div className="mt-3 space-y-3">
                <LocaleSwitcher id="locale-switcher-footer" />
                <button
                  type="button"
                  onClick={reopen}
                  className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
                >
                  {t("cookieSettings")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-edge pt-6 text-xs text-muted">
          © {new Date().getFullYear()} form-human-guard · MIT · {t("bottomLine")}
        </p>
      </div>
    </footer>
  );
}

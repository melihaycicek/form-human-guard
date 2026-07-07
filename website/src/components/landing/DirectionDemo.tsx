"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DirectionGuard } from "form-human-guard/react";
import type { Difficulty } from "form-human-guard";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { XrayPanel } from "./XrayPanel";
import type { XrayEvent } from "./XrayPanel";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "strict"];
const DEMO_ENDPOINT = "/api/guard/demo";

/**
 * Live DirectionGuard demo with an X-ray side panel. The panel taps the
 * page's fetch to mirror exactly what the real component sends and receives
 * from the real server — no mocked payloads.
 */
export function DirectionDemo() {
  const t = useTranslations("demoDirection");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [events, setEvents] = useState<XrayEvent[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const nextId = useRef(0);

  // Tap window.fetch for guard-demo requests only, so the X-ray shows the
  // component's real network traffic. Restored on unmount.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isDemoCall = url.startsWith(`${DEMO_ENDPOINT}/`);
      let requestBody: unknown;
      if (isDemoCall && typeof init?.body === "string") {
        try {
          requestBody = JSON.parse(init.body);
        } catch {
          requestBody = init.body;
        }
      }
      const response = await original(input, init);
      if (isDemoCall) {
        const method = init?.method?.toUpperCase() ?? "GET";
        response
          .clone()
          .json()
          .then((body) => {
            setEvents((prev) => [
              ...prev.slice(-19),
              {
                id: nextId.current++,
                method,
                path: url,
                status: response.status,
                request: requestBody,
                response: body,
              },
            ]);
          })
          .catch(() => undefined);
      }
      return response;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  const onVerified = useCallback((issued: string) => setToken(issued), []);

  function selectDifficulty(next: Difficulty) {
    setDifficulty(next);
    setToken(null);
  }

  function reset() {
    setToken(null);
    setEvents([]);
    setResetCount((n) => n + 1);
  }

  return (
    <section id="demo" aria-labelledby="demo-direction-heading" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          kicker={t("kicker")}
          title={t("heading")}
          lead={t("lead")}
          id="demo-direction-heading"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="radiogroup" aria-label={t("difficulty")} className="flex gap-1 rounded-xl border border-edge bg-surface p-1">
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === level}
                    onClick={() => selectDifficulty(level)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      difficulty === level
                        ? "bg-card text-accent shadow-sm ring-1 ring-edge"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t(level)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
              >
                {t("reset")}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">{t("difficultyNote")}</p>

            <div className="fhg-demo-frame mt-6 flex min-h-[13rem] items-center justify-center rounded-xl border border-dashed border-edge bg-surface/50 p-6">
              <DirectionGuard
                key={`${difficulty}-${resetCount}`}
                endpoint={DEMO_ENDPOINT}
                difficulty={difficulty}
                onVerified={onVerified}
              />
            </div>

            {token && (
              <div className="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4">
                <p className="text-sm font-semibold text-ok">{t("verified")}</p>
                <p className="mt-1 break-all font-mono text-xs text-muted">
                  {token.slice(0, 40)}…{token.slice(-10)}
                </p>
                <p className="mt-2 text-xs text-muted">{t("tokenNote")}</p>
              </div>
            )}
          </div>

          <XrayPanel events={events} />
        </div>
      </div>
    </section>
  );
}

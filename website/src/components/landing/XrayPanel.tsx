"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export interface XrayEvent {
  id: number;
  method: string;
  path: string;
  status: number;
  request?: unknown;
  response?: unknown;
}

/** Truncate long strings (tokens) so the panel stays readable. */
function truncateDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 44 ? `${value.slice(0, 24)}…${value.slice(-8)}` : value;
  }
  if (Array.isArray(value)) return value.map(truncateDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, truncateDeep(v)])
    );
  }
  return value;
}

function statusClass(status: number): string {
  if (status < 300) return "text-ok";
  if (status === 409) return "text-warn";
  return "text-bad";
}

/**
 * The "X-ray view": every request the guard component makes to the demo API
 * and the raw JSON that came back, live.
 */
export function XrayPanel({ events }: { events: XrayEvent[] }) {
  const t = useTranslations("demoDirection");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-edge bg-card">
      <div className="flex items-center gap-2 border-b border-edge bg-surface px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/60" />
        </span>
        <p className="font-mono text-xs text-muted">{t("xrayTitle")}</p>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[26rem] flex-1 space-y-4 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        aria-live="polite"
      >
        {events.length === 0 ? (
          <p className="text-muted">{t("xrayEmpty")}</p>
        ) : (
          events.map((event) => (
            <div key={event.id}>
              <p>
                <span className="font-semibold text-accent">{event.method}</span>{" "}
                <span className="break-all text-muted">{event.path}</span>{" "}
                <span className={`font-semibold ${statusClass(event.status)}`}>{event.status}</span>
              </p>
              {event.request !== undefined && (
                <pre className="mt-1 overflow-x-auto rounded-lg bg-surface p-3 text-[11px]">
                  {`→ ${JSON.stringify(truncateDeep(event.request), null, 2)}`}
                </pre>
              )}
              {event.response !== undefined && (
                <pre className="mt-1 overflow-x-auto rounded-lg bg-surface p-3 text-[11px]">
                  {`← ${JSON.stringify(truncateDeep(event.response), null, 2)}`}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

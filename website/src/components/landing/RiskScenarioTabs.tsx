"use client";

import { useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/Tabs";
import type { RiskScenario } from "./RiskExplainer";

function DecisionBadge({ decision }: { decision: string }) {
  const t = useTranslations("risk");
  const styles: Record<string, string> = {
    allow: "bg-ok/10 text-ok border-ok/40",
    challenge_again: "bg-warn/10 text-warn border-warn/40",
    deny: "bg-bad/10 text-bad border-bad/40",
  };
  const labels: Record<string, string> = {
    allow: t("decisionAllow"),
    challenge_again: t("decisionChallengeAgain"),
    deny: t("decisionDeny"),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${styles[decision]}`}>
      {labels[decision]}
    </span>
  );
}

function ScenarioPanel({ scenario }: { scenario: RiskScenario }) {
  const t = useTranslations("risk");
  const { assessment, input } = scenario;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border border-edge bg-card p-6">
        <p className="text-sm text-muted">{t(`scenarios.${scenario.key}.desc`)}</p>
        <dl className="mt-5 space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-4 border-b border-edge pb-2">
            <dt className="text-muted">serverElapsedMs</dt>
            <dd>{input.serverElapsedMs}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-edge pb-2">
            <dt className="text-muted">signals</dt>
            <dd className="text-right">
              {input.signals === undefined ? "undefined" : JSON.stringify(input.signals)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">minimalRotateSteps</dt>
            <dd>3</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-edge bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DecisionBadge decision={assessment.decision} />
          <p className="font-mono text-sm">
            <span className="text-muted">{t("score")}</span>{" "}
            <span className="text-lg font-bold">{assessment.score}</span>
            <span className="text-muted">/100</span>
          </p>
        </div>
        <div
          role="img"
          aria-label={`${t("score")}: ${assessment.score}/100`}
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface"
        >
          <div
            className={`h-full rounded-full ${
              assessment.decision === "allow"
                ? "bg-ok"
                : assessment.decision === "deny"
                  ? "bg-bad"
                  : "bg-warn"
            }`}
            style={{ width: `${Math.max(assessment.score, 2)}%` }}
          />
        </div>
        <h4 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
          {t("reasons")}
        </h4>
        {assessment.results.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("noReasons")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {assessment.results.map((result) => (
              <li key={result.ruleId} className="rounded-lg bg-surface p-3 text-xs">
                <span className="font-mono font-semibold text-accent">
                  {result.ruleId} (+{result.score})
                </span>
                <p className="mt-1 text-muted">{result.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function RiskScenarioTabs({ scenarios }: { scenarios: RiskScenario[] }) {
  const t = useTranslations("risk");
  return (
    <Tabs
      ariaLabel={t("heading")}
      items={scenarios.map((scenario) => ({
        id: scenario.key,
        label: t(`scenarios.${scenario.key}.label`),
        content: <ScenarioPanel scenario={scenario} />,
      }))}
    />
  );
}

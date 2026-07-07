import {
  assessDirectionMatchRisk,
  validateDirectionMatchSignals,
} from "form-human-guard/server";
import type { RiskAssessment } from "form-human-guard/server";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RiskScenarioTabs } from "./RiskScenarioTabs";

export interface RiskScenario {
  key: "human" | "signalless" | "impossible";
  input: {
    serverElapsedMs: number;
    signals: unknown;
  };
  assessment: RiskAssessment;
}

/**
 * Three canned interactions run through the REAL risk engine on the server
 * (deterministic, so this renders statically). Nothing here is mocked: the
 * scores, decisions, and reasons come from `assessDirectionMatchRisk`.
 */
function buildScenarios(): RiskScenario[] {
  const base = {
    mode: "direction-match" as const,
    challengeTtlMs: 120_000,
    attemptCount: 0,
    minDurationMs: 400,
    maxDurationMs: 20_000,
    minimalRotateSteps: 3,
    inputType: "mouse" as const,
  };

  const cases = [
    {
      key: "human" as const,
      serverElapsedMs: 3_200,
      clientDurationMs: 3_150,
      rawSignals: { rotateCount: 4, eventCount: 9, directionChangeCount: 1 },
    },
    {
      key: "signalless" as const,
      serverElapsedMs: 2_600,
      clientDurationMs: undefined,
      rawSignals: undefined,
    },
    {
      key: "impossible" as const,
      serverElapsedMs: 450,
      clientDurationMs: 12,
      rawSignals: { rotateCount: 1, eventCount: 1, directionChangeCount: 0 },
    },
  ];

  return cases.map(({ key, serverElapsedMs, clientDurationMs, rawSignals }) => {
    const { signals, anomalies } = validateDirectionMatchSignals(rawSignals);
    const assessment = assessDirectionMatchRisk({
      ...base,
      serverElapsedMs,
      challengeAgeMs: serverElapsedMs,
      clientDurationMs,
      signals,
      signalAnomalies: anomalies,
    });
    return { key, input: { serverElapsedMs, signals: rawSignals }, assessment };
  });
}

export async function RiskExplainer() {
  const t = await getTranslations("risk");
  const scenarios = buildScenarios();

  return (
    <section aria-labelledby="risk-heading" className="border-t border-edge bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading kicker={t("kicker")} title={t("heading")} lead={t("lead")} id="risk-heading" />
        <div className="mt-10">
          <RiskScenarioTabs scenarios={scenarios} />
        </div>
        <p className="mt-6 max-w-3xl text-sm text-muted">{t("note")}</p>
      </div>
    </section>
  );
}

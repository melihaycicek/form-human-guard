import { defaultDirectionMatchRiskRules } from "./rules";
import type { RiskAssessment, RiskConfig, RiskContext, RiskDecision, RiskRuleResult } from "./types";

export const DEFAULT_DENY_THRESHOLD = 60;
export const DEFAULT_CHALLENGE_AGAIN_THRESHOLD = 35;

/**
 * Deterministic rule-based risk assessment. Runs every rule, sums the
 * scores (clamped to 0–100) and maps the total onto a decision. The
 * assessment lists each fired rule and its reason, so every decision is
 * explainable.
 */
export function assessDirectionMatchRisk(
  context: RiskContext,
  config: RiskConfig = {}
): RiskAssessment {
  if (config.enabled === false) {
    return { score: 0, decision: "allow", reasons: [], results: [] };
  }

  const rules = config.rules ?? defaultDirectionMatchRiskRules;
  const denyThreshold = config.denyThreshold ?? DEFAULT_DENY_THRESHOLD;
  const challengeAgainThreshold =
    config.challengeAgainThreshold ?? DEFAULT_CHALLENGE_AGAIN_THRESHOLD;

  const results: RiskRuleResult[] = [];
  for (const rule of rules) {
    const result = rule.evaluate(context);
    if (result) {
      results.push(result);
    }
  }

  const score = Math.max(0, Math.min(100, results.reduce((sum, r) => sum + r.score, 0)));

  let decision: RiskDecision = "allow";
  if (score >= denyThreshold) {
    decision = "deny";
  } else if (score >= challengeAgainThreshold) {
    decision = "challenge_again";
  }

  return { score, decision, reasons: results.map((r) => r.reason), results };
}

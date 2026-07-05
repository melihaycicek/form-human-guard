import type { InputType } from "../../core/types";
import type { NormalizedDirectionMatchSignals, SignalAnomaly } from "../signals";

export type RiskDecision = "allow" | "deny" | "challenge_again";

/**
 * Everything a risk rule may look at. All server-derived values are trusted;
 * client-reported values are marked as such and only ever raise the score.
 */
export interface RiskContext {
  mode: "direction-match";
  /** Trusted: measured from server-side challenge creation time. */
  serverElapsedMs: number;
  /** Trusted: challenge TTL (expiresAt - createdAt). */
  challengeTtlMs: number;
  /** Trusted: alias of serverElapsedMs for rules that reason about age. */
  challengeAgeMs: number;
  /** Trusted: failed attempts recorded against this challenge. */
  attemptCount: number;
  /** Trusted: timing thresholds for the challenge's difficulty. */
  minDurationMs: number;
  maxDurationMs: number;
  /** Trusted: minimal rotation steps between initial and target direction. */
  minimalRotateSteps: number;
  /** Client-reported. */
  inputType: InputType;
  /** Client-reported telemetry; only used to detect replay-like mismatches. */
  clientDurationMs?: number;
  /** Client-reported, validated. */
  signals: NormalizedDirectionMatchSignals;
  signalAnomalies: SignalAnomaly[];
}

export interface RiskRuleResult {
  ruleId: string;
  score: number;
  reason: string;
}

export interface RiskRule {
  id: string;
  /** Return a finding to add score, or null when the rule does not apply. */
  evaluate(context: RiskContext): RiskRuleResult | null;
}

export interface RiskAssessment {
  /** Sum of rule scores, clamped to 0–100. */
  score: number;
  decision: RiskDecision;
  /** Human-readable reasons of every rule that fired — the explainability surface. */
  reasons: string[];
  results: RiskRuleResult[];
}

export interface RiskConfig {
  /** Default true for direction-match verifications. */
  enabled?: boolean;
  /** Score at or above which the decision is "deny". Default 60. */
  denyThreshold?: number;
  /**
   * Score at or above which the decision is "challenge_again" (the challenge
   * is invalidated and the client must solve a fresh one). Default 35.
   */
  challengeAgainThreshold?: number;
  /** Replace the default rule set. */
  rules?: RiskRule[];
}

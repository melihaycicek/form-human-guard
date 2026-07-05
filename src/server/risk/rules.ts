import type { RiskRule } from "./types";

/**
 * Default deterministic rule set for direction-match verifications. Every
 * rule is a pure function of the RiskContext, fires with a fixed score, and
 * carries a human-readable reason. No ML, no external services.
 */
export const defaultDirectionMatchRiskRules: RiskRule[] = [
  {
    id: "near-min-duration",
    evaluate: (ctx) =>
      ctx.serverElapsedMs < ctx.minDurationMs * 1.5
        ? {
            ruleId: "near-min-duration",
            score: 20,
            reason: `Solved in ${ctx.serverElapsedMs}ms, suspiciously close to the ${ctx.minDurationMs}ms minimum`,
          }
        : null,
  },
  {
    id: "missing-signals",
    evaluate: (ctx) =>
      ctx.signalAnomalies.includes("SIGNALS_MISSING")
        ? {
            ruleId: "missing-signals",
            score: 40,
            reason: "No interaction signals were reported",
          }
        : null,
  },
  {
    id: "malformed-signals",
    evaluate: (ctx) =>
      ctx.signalAnomalies.includes("SIGNALS_MALFORMED") ||
      ctx.signalAnomalies.includes("SIGNALS_OUT_OF_RANGE")
        ? {
            ruleId: "malformed-signals",
            score: 35,
            reason: "Interaction signals were malformed or out of range",
          }
        : null,
  },
  {
    id: "inconsistent-signals",
    evaluate: (ctx) =>
      ctx.signalAnomalies.includes("SIGNALS_INCONSISTENT")
        ? {
            ruleId: "inconsistent-signals",
            score: 40,
            reason: "Interaction signals contradict each other",
          }
        : null,
  },
  {
    id: "impossible-rotation",
    evaluate: (ctx) =>
      ctx.signals.rotateCount !== null && ctx.signals.rotateCount < ctx.minimalRotateSteps
        ? {
            ruleId: "impossible-rotation",
            score: 50,
            reason: `Reported ${ctx.signals.rotateCount} rotation steps but at least ${ctx.minimalRotateSteps} are required to reach the target`,
          }
        : null,
  },
  {
    id: "no-interaction-events",
    evaluate: (ctx) =>
      ctx.signals.eventCount === 0
        ? {
            ruleId: "no-interaction-events",
            score: 45,
            reason: "Zero input events were reported for a solved challenge",
          }
        : null,
  },
  {
    id: "excessive-rotation",
    evaluate: (ctx) =>
      ctx.signals.rotateCount !== null && ctx.signals.rotateCount > 100
        ? {
            ruleId: "excessive-rotation",
            score: 15,
            reason: `Reported ${ctx.signals.rotateCount} rotation steps, far beyond human-scale interaction`,
          }
        : null,
  },
  {
    id: "repeated-failures",
    evaluate: (ctx) =>
      ctx.attemptCount > 0
        ? {
            ruleId: "repeated-failures",
            score: Math.min(30, 15 * ctx.attemptCount),
            reason: `${ctx.attemptCount} failed attempt(s) already recorded on this challenge`,
          }
        : null,
  },
  {
    id: "stale-challenge",
    evaluate: (ctx) =>
      ctx.challengeAgeMs > ctx.challengeTtlMs * 0.9
        ? {
            ruleId: "stale-challenge",
            score: 10,
            reason: "Challenge was answered in the last moments before expiry",
          }
        : null,
  },
  {
    id: "client-duration-mismatch",
    evaluate: (ctx) => {
      if (ctx.clientDurationMs === undefined) {
        return null;
      }
      const diff = Math.abs(ctx.clientDurationMs - ctx.serverElapsedMs);
      // A wildly different client-reported duration is a replay indicator:
      // replayed payloads carry timings from a previous solve.
      return diff > Math.max(3_000, ctx.serverElapsedMs)
        ? {
            ruleId: "client-duration-mismatch",
            score: 20,
            reason: `Client-reported duration (${ctx.clientDurationMs}ms) diverges from server-measured time (${ctx.serverElapsedMs}ms)`,
          }
        : null;
    },
  },
];

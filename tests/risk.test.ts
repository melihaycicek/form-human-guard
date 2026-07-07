import { describe, expect, it } from "vitest";
import {
  assessDirectionMatchRisk,
  DEFAULT_CHALLENGE_AGAIN_THRESHOLD,
  DEFAULT_DENY_THRESHOLD,
} from "../src/server/risk/engine";
import type { RiskContext } from "../src/server/risk/types";
import { validateDirectionMatchSignals } from "../src/server/signals";

function makeContext(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    mode: "direction-match",
    serverElapsedMs: 3_000,
    challengeTtlMs: 120_000,
    challengeAgeMs: 3_000,
    attemptCount: 0,
    minDurationMs: 400,
    maxDurationMs: 20_000,
    minimalRotateSteps: 3,
    inputType: "mouse",
    signals: { present: true, rotateCount: 3, eventCount: 4, directionChangeCount: 0 },
    signalAnomalies: [],
    ...overrides,
  };
}

describe("validateDirectionMatchSignals", () => {
  it("normalizes a well-formed signals object without anomalies", () => {
    const result = validateDirectionMatchSignals({
      rotateCount: 3,
      eventCount: 5,
      directionChangeCount: 1,
    });
    expect(result.anomalies).toEqual([]);
    expect(result.signals).toEqual({
      present: true,
      rotateCount: 3,
      eventCount: 5,
      directionChangeCount: 1,
    });
  });

  it("flags missing signals", () => {
    expect(validateDirectionMatchSignals(undefined).anomalies).toEqual(["SIGNALS_MISSING"]);
    expect(validateDirectionMatchSignals(null).anomalies).toEqual(["SIGNALS_MISSING"]);
  });

  it("flags malformed shapes and value types", () => {
    expect(validateDirectionMatchSignals("nope").anomalies).toEqual(["SIGNALS_MALFORMED"]);
    expect(validateDirectionMatchSignals([1, 2]).anomalies).toEqual(["SIGNALS_MALFORMED"]);
    const partial = validateDirectionMatchSignals({ rotateCount: "3" });
    expect(partial.anomalies).toContain("SIGNALS_MALFORMED");
    expect(partial.signals.rotateCount).toBeNull();
  });

  it("flags out-of-range counters", () => {
    const negative = validateDirectionMatchSignals({
      rotateCount: -1,
      eventCount: 2,
      directionChangeCount: 0,
    });
    expect(negative.anomalies).toContain("SIGNALS_OUT_OF_RANGE");

    const huge = validateDirectionMatchSignals({
      rotateCount: 3,
      eventCount: 999_999,
      directionChangeCount: 0,
    });
    expect(huge.anomalies).toContain("SIGNALS_OUT_OF_RANGE");
  });

  it("flags internally inconsistent counters", () => {
    const fewerEvents = validateDirectionMatchSignals({
      rotateCount: 10,
      eventCount: 2,
      directionChangeCount: 0,
    });
    expect(fewerEvents.anomalies).toContain("SIGNALS_INCONSISTENT");

    const impossibleChanges = validateDirectionMatchSignals({
      rotateCount: 2,
      eventCount: 5,
      directionChangeCount: 4,
    });
    expect(impossibleChanges.anomalies).toContain("SIGNALS_INCONSISTENT");
  });
});

describe("assessDirectionMatchRisk", () => {
  it("allows a plausible human interaction with score 0", () => {
    const assessment = assessDirectionMatchRisk(makeContext());
    expect(assessment).toEqual({ score: 0, decision: "allow", reasons: [], results: [] });
  });

  it("denies when strong signals stack up (near-min duration + missing signals)", () => {
    const validation = validateDirectionMatchSignals(undefined);
    const assessment = assessDirectionMatchRisk(
      makeContext({
        serverElapsedMs: 450,
        challengeAgeMs: 450,
        signals: validation.signals,
        signalAnomalies: validation.anomalies,
      })
    );
    expect(assessment.score).toBeGreaterThanOrEqual(DEFAULT_DENY_THRESHOLD);
    expect(assessment.decision).toBe("deny");
    expect(assessment.results.map((r) => r.ruleId)).toEqual(
      expect.arrayContaining(["near-min-duration", "missing-signals"])
    );
  });

  it("asks for a new challenge on a single medium signal (missing signals only)", () => {
    const validation = validateDirectionMatchSignals(undefined);
    const assessment = assessDirectionMatchRisk(
      makeContext({ signals: validation.signals, signalAnomalies: validation.anomalies })
    );
    expect(assessment.score).toBeGreaterThanOrEqual(DEFAULT_CHALLENGE_AGAIN_THRESHOLD);
    expect(assessment.score).toBeLessThan(DEFAULT_DENY_THRESHOLD);
    expect(assessment.decision).toBe("challenge_again");
  });

  it("denies physically impossible rotation counts", () => {
    const assessment = assessDirectionMatchRisk(
      makeContext({
        minimalRotateSteps: 4,
        signals: { present: true, rotateCount: 1, eventCount: 2, directionChangeCount: 0 },
      })
    );
    expect(assessment.results.map((r) => r.ruleId)).toContain("impossible-rotation");

    const withZeroEvents = assessDirectionMatchRisk(
      makeContext({
        minimalRotateSteps: 4,
        signals: { present: true, rotateCount: 0, eventCount: 0, directionChangeCount: 0 },
      })
    );
    expect(withZeroEvents.decision).toBe("deny");
  });

  it("raises the score for repeated failures and replay-like duration mismatch", () => {
    const assessment = assessDirectionMatchRisk(
      makeContext({ attemptCount: 1, clientDurationMs: 60_000 })
    );
    const ruleIds = assessment.results.map((r) => r.ruleId);
    expect(ruleIds).toContain("repeated-failures");
    expect(ruleIds).toContain("client-duration-mismatch");
  });

  it("flags challenges answered moments before expiry", () => {
    const assessment = assessDirectionMatchRisk(
      makeContext({ serverElapsedMs: 15_000, challengeAgeMs: 111_000 })
    );
    expect(assessment.results.map((r) => r.ruleId)).toContain("stale-challenge");
  });

  it("is explainable: every fired rule carries a reason", () => {
    const validation = validateDirectionMatchSignals(undefined);
    const assessment = assessDirectionMatchRisk(
      makeContext({
        serverElapsedMs: 450,
        signals: validation.signals,
        signalAnomalies: validation.anomalies,
      })
    );
    expect(assessment.reasons.length).toBe(assessment.results.length);
    for (const reason of assessment.reasons) {
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  it("clamps the score to 100", () => {
    const validation = validateDirectionMatchSignals({
      rotateCount: 500,
      eventCount: 2,
      directionChangeCount: 900,
    });
    const assessment = assessDirectionMatchRisk(
      makeContext({
        serverElapsedMs: 401,
        attemptCount: 1,
        minimalRotateSteps: 4,
        clientDurationMs: 90_000,
        signals: validation.signals,
        signalAnomalies: validation.anomalies,
      })
    );
    expect(assessment.score).toBeLessThanOrEqual(100);
    expect(assessment.decision).toBe("deny");
  });

  it("respects configuration: disabled, custom thresholds, custom rules", () => {
    const validation = validateDirectionMatchSignals(undefined);
    const context = makeContext({
      signals: validation.signals,
      signalAnomalies: validation.anomalies,
    });

    expect(assessDirectionMatchRisk(context, { enabled: false }).decision).toBe("allow");

    expect(
      assessDirectionMatchRisk(context, { denyThreshold: 30, challengeAgainThreshold: 10 }).decision
    ).toBe("deny");

    const custom = assessDirectionMatchRisk(context, {
      rules: [
        {
          id: "always-suspicious",
          evaluate: () => ({ ruleId: "always-suspicious", score: 99, reason: "test rule" }),
        },
      ],
    });
    expect(custom.decision).toBe("deny");
    expect(custom.reasons).toEqual(["test rule"]);
  });

  it("is deterministic for identical inputs", () => {
    const context = makeContext({ serverElapsedMs: 450, attemptCount: 1 });
    const a = assessDirectionMatchRisk(context);
    const b = assessDirectionMatchRisk(context);
    expect(a).toEqual(b);
  });
});

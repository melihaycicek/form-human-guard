import { CHALLENGE_EVICTION_GRACE_MS, MAX_FAILED_ATTEMPTS } from "../core/constants";
import { directionMatchDifficultyConfig } from "../core/difficulty";
import type { GuardErrorCode } from "../core/errors";
import type { GuardTokenPayload } from "../core/types";
import { isChallengeExpired } from "../modes/direction/direction.verify";
import { ringDistance } from "../modes/direction-match/directionMatch.utils";
import type { DirectionMatchResponse } from "../modes/direction-match/directionMatch.types";
import type { GuardStore } from "../stores/Store";
import { issueGuardToken } from "./issueToken";
import { assessDirectionMatchRisk } from "./risk/engine";
import type { RiskAssessment, RiskConfig } from "./risk/types";
import { validateDirectionMatchSignals } from "./signals";

export interface VerifyDirectionMatchOptions {
  store: GuardStore;
  secret: string;
  response: DirectionMatchResponse;
  /** If set, embedded into the issued token and required at token verification. */
  action?: string;
  tokenTtlMs?: number;
  /** Rule-based risk scoring configuration. Enabled by default. */
  risk?: RiskConfig;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

export type VerifyDirectionMatchResult =
  | { ok: true; token: string; payload: GuardTokenPayload; risk: RiskAssessment }
  | { ok: false; code: GuardErrorCode; risk?: RiskAssessment };

/**
 * Verify a direction-match response. Order of checks:
 *
 * 1. challenge exists, is a direction-match challenge, and is not expired
 * 2. final selected direction equals the server-side target (wrong answers
 *    increment the attempt count; the challenge dies after 2 failures)
 * 3. server-side timing thresholds (min/max solve duration per difficulty)
 * 4. signal validation + deterministic rule-based risk scoring
 *
 * Timing is always measured from server-side challenge creation;
 * `clientDurationMs` is telemetry that can only ever raise the risk score.
 * On "deny" and "challenge_again" decisions the challenge is invalidated.
 */
export async function verifyDirectionMatchChallenge(
  options: VerifyDirectionMatchOptions
): Promise<VerifyDirectionMatchResult> {
  const { store, secret, response } = options;
  const now = options.now ?? Date.now();

  const challenge = await store.getChallenge(response.challengeId);
  if (!challenge) {
    return { ok: false, code: "CHALLENGE_NOT_FOUND" };
  }
  if (challenge.mode !== "direction-match") {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  if (isChallengeExpired(challenge, now)) {
    await store.deleteChallenge(response.challengeId);
    return { ok: false, code: "CHALLENGE_EXPIRED" };
  }

  if (response.direction !== challenge.expectedDirection) {
    const attemptCount = challenge.attemptCount + 1;
    if (attemptCount >= MAX_FAILED_ATTEMPTS) {
      await store.deleteChallenge(response.challengeId);
    } else {
      const remainingTtlMs = challenge.expiresAt - now + CHALLENGE_EVICTION_GRACE_MS;
      await store.setChallenge(response.challengeId, { ...challenge, attemptCount }, remainingTtlMs);
    }
    return { ok: false, code: "WRONG_DIRECTION" };
  }

  const config = directionMatchDifficultyConfig[challenge.difficulty];
  const serverElapsedMs = now - challenge.createdAt;
  if (serverElapsedMs < config.minDurationMs) {
    return { ok: false, code: "TOO_FAST" };
  }
  if (serverElapsedMs > config.maxDurationMs) {
    return { ok: false, code: "TOO_SLOW" };
  }

  const { signals, anomalies } = validateDirectionMatchSignals(response.signals);
  const assessment = assessDirectionMatchRisk(
    {
      mode: "direction-match",
      serverElapsedMs,
      challengeTtlMs: challenge.expiresAt - challenge.createdAt,
      challengeAgeMs: serverElapsedMs,
      attemptCount: challenge.attemptCount,
      minDurationMs: config.minDurationMs,
      maxDurationMs: config.maxDurationMs,
      minimalRotateSteps: challenge.initialDirection
        ? ringDistance(challenge.initialDirection, challenge.expectedDirection)
        : 1,
      inputType: response.inputType,
      clientDurationMs: response.clientDurationMs,
      signals,
      signalAnomalies: anomalies,
    },
    options.risk
  );

  if (assessment.decision === "deny") {
    await store.deleteChallenge(response.challengeId);
    return { ok: false, code: "RISK_DENIED", risk: assessment };
  }
  if (assessment.decision === "challenge_again") {
    await store.deleteChallenge(response.challengeId);
    return { ok: false, code: "CHALLENGE_AGAIN", risk: assessment };
  }

  await store.deleteChallenge(response.challengeId);
  const issued = await issueGuardToken({
    store,
    secret,
    challengeId: response.challengeId,
    mode: "direction-match",
    action: options.action,
    tokenTtlMs: options.tokenTtlMs,
    now,
  });

  return { ok: true, token: issued.token, payload: issued.payload, risk: assessment };
}

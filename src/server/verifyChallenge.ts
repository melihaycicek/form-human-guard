import { CHALLENGE_EVICTION_GRACE_MS, MAX_FAILED_ATTEMPTS } from "../core/constants";
import { difficultyConfig } from "../core/difficulty";
import type { GuardErrorCode } from "../core/errors";
import type { GuardTokenPayload } from "../core/types";
import type { DirectionResponse } from "../modes/direction/direction.types";
import { isChallengeExpired, isCorrectDirection } from "../modes/direction/direction.verify";
import type { GuardStore } from "../stores/Store";
import { analyzeDirectionInteraction } from "./analyzer/analyzeDirectionInteraction";
import { issueGuardToken } from "./issueToken";

export interface VerifyChallengeOptions {
  store: GuardStore;
  secret: string;
  response: DirectionResponse;
  /** If set, embedded into the issued token and required at token verification. */
  action?: string;
  tokenTtlMs?: number;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

export type VerifyDirectionChallengeResult =
  | { ok: true; token: string; payload: GuardTokenPayload }
  | { ok: false; code: GuardErrorCode };

/**
 * Verify a direction response against the stored challenge. Timing is
 * computed server-side from the challenge's createdAt; `clientDurationMs`
 * is never consulted. On success the challenge is deleted and a one-time
 * guard token is issued.
 */
export async function verifyDirectionChallenge(
  options: VerifyChallengeOptions
): Promise<VerifyDirectionChallengeResult> {
  const { store, secret, response } = options;
  const now = options.now ?? Date.now();

  const challenge = await store.getChallenge(response.challengeId);
  if (!challenge) {
    return { ok: false, code: "CHALLENGE_NOT_FOUND" };
  }

  if (isChallengeExpired(challenge, now)) {
    await store.deleteChallenge(response.challengeId);
    return { ok: false, code: "CHALLENGE_EXPIRED" };
  }

  if (!isCorrectDirection(challenge, response)) {
    const attemptCount = challenge.attemptCount + 1;
    if (attemptCount >= MAX_FAILED_ATTEMPTS) {
      await store.deleteChallenge(response.challengeId);
    } else {
      const remainingTtlMs = challenge.expiresAt - now + CHALLENGE_EVICTION_GRACE_MS;
      await store.setChallenge(response.challengeId, { ...challenge, attemptCount }, remainingTtlMs);
    }
    return { ok: false, code: "WRONG_DIRECTION" };
  }

  const analysis = analyzeDirectionInteraction({
    serverElapsedMs: now - challenge.createdAt,
    pointerDistance: response.pointerDistance,
    inputType: response.inputType,
    config: difficultyConfig[challenge.difficulty],
  });
  if (!analysis.ok) {
    return { ok: false, code: analysis.reasons[0] as GuardErrorCode };
  }

  await store.deleteChallenge(response.challengeId);
  const issued = await issueGuardToken({
    store,
    secret,
    challengeId: response.challengeId,
    action: options.action,
    tokenTtlMs: options.tokenTtlMs,
    now,
  });

  return { ok: true, token: issued.token, payload: issued.payload };
}

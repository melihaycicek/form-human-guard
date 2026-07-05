import { CHALLENGE_EVICTION_GRACE_MS } from "../core/constants";
import type { Difficulty } from "../core/types";
import { createDirectionChallengeData } from "../modes/direction/direction.create";
import type { PublicDirectionChallenge } from "../modes/direction/direction.types";
import { createDirectionMatchChallengeData } from "../modes/direction-match/directionMatch.create";
import type { PublicDirectionMatchChallenge } from "../modes/direction-match/directionMatch.types";
import type { GuardStore } from "../stores/Store";

export interface CreateChallengeOptions {
  store: GuardStore;
  difficulty?: Difficulty;
  challengeTtlMs?: number;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

/**
 * Create and persist a direction challenge. The store entry outlives the
 * logical expiry by a grace period so verification can report
 * CHALLENGE_EXPIRED; expiry itself is enforced against `expiresAt`.
 */
export async function createDirectionChallenge(
  options: CreateChallengeOptions
): Promise<PublicDirectionChallenge> {
  const data = createDirectionChallengeData({
    difficulty: options.difficulty ?? "easy",
    ttlMs: options.challengeTtlMs,
    now: options.now,
  });

  const ttlMs = data.stored.expiresAt - data.stored.createdAt;
  await options.store.setChallenge(data.challengeId, data.stored, ttlMs + CHALLENGE_EVICTION_GRACE_MS);

  return data.publicChallenge;
}

/**
 * Create and persist a direction-match challenge (rotate the initial
 * direction until it matches the randomized target). Same storage and
 * expiry semantics as the direction challenge.
 */
export async function createDirectionMatchChallenge(
  options: CreateChallengeOptions
): Promise<PublicDirectionMatchChallenge> {
  const data = createDirectionMatchChallengeData({
    difficulty: options.difficulty ?? "easy",
    ttlMs: options.challengeTtlMs,
    now: options.now,
  });

  const ttlMs = data.stored.expiresAt - data.stored.createdAt;
  await options.store.setChallenge(data.challengeId, data.stored, ttlMs + CHALLENGE_EVICTION_GRACE_MS);

  return data.publicChallenge;
}

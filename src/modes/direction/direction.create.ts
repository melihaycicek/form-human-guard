import { DEFAULT_CHALLENGE_TTL_MS } from "../../core/constants";
import { randomId, randomPick } from "../../core/random";
import type { Difficulty, StoredChallenge } from "../../core/types";
import { DIRECTIONS } from "./direction.constants";
import type { PublicDirectionChallenge } from "./direction.types";

export interface CreateDirectionChallengeDataInput {
  difficulty: Difficulty;
  ttlMs?: number;
  now?: number;
}

export interface DirectionChallengeData {
  challengeId: string;
  stored: StoredChallenge;
  publicChallenge: PublicDirectionChallenge;
}

/** Pure challenge construction; persistence happens in the server layer. */
export function createDirectionChallengeData(
  input: CreateDirectionChallengeDataInput
): DirectionChallengeData {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS;
  const challengeId = randomId();
  const expectedDirection = randomPick(DIRECTIONS);
  const expiresAt = now + ttlMs;

  return {
    challengeId,
    stored: {
      expectedDirection,
      createdAt: now,
      expiresAt,
      attemptCount: 0,
      difficulty: input.difficulty,
      mode: "direction",
    },
    publicChallenge: {
      challengeId,
      mode: "direction",
      direction: expectedDirection,
      difficulty: input.difficulty,
      expiresAt,
    },
  };
}

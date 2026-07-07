import { DEFAULT_CHALLENGE_TTL_MS } from "../../core/constants";
import { randomId, randomIntBelow } from "../../core/random";
import type { Difficulty, Direction, StoredChallenge } from "../../core/types";
import { DIRECTION_RING, rotateDirection } from "./directionMatch.utils";
import type { PublicDirectionMatchChallenge } from "./directionMatch.types";

export interface DirectionPair {
  targetDirection: Direction;
  initialDirection: Direction;
}

/**
 * Randomize the target and initial directions. The initial direction is the
 * target rotated by a random non-zero offset, so the pair is never equal.
 * Isolated and injectable for deterministic tests; defaults to crypto random.
 */
export function randomDirectionPair(
  randomIntFn: (maxExclusive: number) => number = randomIntBelow
): DirectionPair {
  const ringSize = DIRECTION_RING.length;
  const targetDirection = DIRECTION_RING[randomIntFn(ringSize)] as Direction;
  const offset = 1 + randomIntFn(ringSize - 1); // 1..7, never 0
  return { targetDirection, initialDirection: rotateDirection(targetDirection, offset) };
}

export interface CreateDirectionMatchChallengeDataInput {
  difficulty: Difficulty;
  ttlMs?: number;
  now?: number;
}

export interface DirectionMatchChallengeData {
  challengeId: string;
  stored: StoredChallenge;
  publicChallenge: PublicDirectionMatchChallenge;
}

/** Pure challenge construction; persistence happens in the server layer. */
export function createDirectionMatchChallengeData(
  input: CreateDirectionMatchChallengeDataInput
): DirectionMatchChallengeData {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS;
  const challengeId = randomId();
  const { targetDirection, initialDirection } = randomDirectionPair();
  const expiresAt = now + ttlMs;

  return {
    challengeId,
    stored: {
      expectedDirection: targetDirection,
      initialDirection,
      createdAt: now,
      expiresAt,
      attemptCount: 0,
      difficulty: input.difficulty,
      mode: "direction-match",
    },
    publicChallenge: {
      challengeId,
      mode: "direction-match",
      targetDirection,
      initialDirection,
      difficulty: input.difficulty,
      expiresAt,
    },
  };
}

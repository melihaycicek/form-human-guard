import type { StoredChallenge } from "../../core/types";
import type { DirectionResponse } from "./direction.types";

export function isChallengeExpired(challenge: StoredChallenge, now: number): boolean {
  return now > challenge.expiresAt;
}

/**
 * Direction correctness. Checked before the interaction analyzer runs;
 * both must pass before a token is issued.
 */
export function isCorrectDirection(
  challenge: StoredChallenge,
  response: DirectionResponse
): boolean {
  return response.direction === challenge.expectedDirection;
}

import type { Difficulty, Direction, InputType } from "../../core/types";

/**
 * The challenge as delivered to the browser. The displayed direction IS the
 * expected direction — this guard is intentionally transparent (see README).
 */
export interface PublicDirectionChallenge {
  challengeId: string;
  mode: "direction";
  direction: Direction;
  difficulty: Difficulty;
  expiresAt: number;
}

/** What the client POSTs back after the user performs the gesture. */
export interface DirectionResponse {
  challengeId: string;
  direction: Direction;
  inputType: InputType;
  /** Straight-line px distance of the pointer gesture. Soft-checked server-side. */
  pointerDistance?: number;
  /** Telemetry only — never used for verification decisions (timing is server-side). */
  clientDurationMs?: number;
}

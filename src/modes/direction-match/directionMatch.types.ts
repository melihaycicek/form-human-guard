import type { Difficulty, Direction, InputType } from "../../core/types";

/**
 * The direction-match challenge as delivered to the browser. The user rotates
 * the current direction (starting at `initialDirection`) until it matches
 * `targetDirection`. Both are randomized server-side and never equal.
 */
export interface PublicDirectionMatchChallenge {
  challengeId: string;
  mode: "direction-match";
  targetDirection: Direction;
  initialDirection: Direction;
  difficulty: Difficulty;
  expiresAt: number;
}

/**
 * Lightweight, non-sensitive interaction metadata reported by the client.
 * Counters only — no coordinates, no fingerprinting. Untrusted input: the
 * server validates it and feeds it into rule-based risk scoring.
 */
export interface DirectionMatchClientSignals {
  /** Total rotation steps performed. */
  rotateCount: number;
  /** Total user input events observed during the interaction. */
  eventCount: number;
  /** How often the rotation direction reversed (left↔right). */
  directionChangeCount: number;
}

/** What the client POSTs back after confirming the matched direction. */
export interface DirectionMatchResponse {
  challengeId: string;
  /** The final selected/current direction. */
  direction: Direction;
  inputType: InputType;
  signals?: DirectionMatchClientSignals;
  /** Telemetry only — never used for verification decisions (timing is server-side). */
  clientDurationMs?: number;
}

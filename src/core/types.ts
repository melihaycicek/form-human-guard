/** The eight compass directions a challenge can ask for. */
export type Direction =
  | "up"
  | "right"
  | "down"
  | "left"
  | "up-right"
  | "up-left"
  | "down-right"
  | "down-left";

export type Difficulty = "easy" | "medium" | "strict";

/** Challenge modes supported by this version. */
export type GuardMode = "direction";

export type InputType = "mouse" | "touch" | "keyboard";

/**
 * Server-side record of a pending challenge. The expected direction lives
 * only here — it is never part of a signed token or error response.
 */
export interface StoredChallenge {
  expectedDirection: Direction;
  createdAt: number;
  /** Logical expiry (createdAt + challenge TTL). Verification rejects after this. */
  expiresAt: number;
  attemptCount: number;
  difficulty: Difficulty;
  mode: GuardMode;
}

export interface GuardTokenPayload {
  jti: string;
  challengeId: string;
  mode: GuardMode;
  action?: string;
  issuedAt: number;
  expiresAt: number;
}

/** Server-side record of an issued, not-yet-consumed guard token. */
export type StoredToken = GuardTokenPayload;

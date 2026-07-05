/** Stable error codes returned by verification and the HTTP adapter. */
export type GuardErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_MODE"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_EXPIRED"
  | "WRONG_DIRECTION"
  | "TOO_FAST"
  | "TOO_SLOW"
  | "MOVEMENT_TOO_SHORT"
  | "TOKEN_INVALID"
  | "TOKEN_NOT_FOUND"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "ACTION_MISMATCH"
  | "RISK_DENIED"
  | "CHALLENGE_AGAIN";

/**
 * Human-readable messages for each code. Static text only — never include
 * secrets, expected directions, or other server internals.
 */
export const errorMessages: Record<GuardErrorCode, string> = {
  INVALID_REQUEST: "The request body is missing required fields or is malformed.",
  UNSUPPORTED_MODE: "The requested challenge mode is not supported.",
  CHALLENGE_NOT_FOUND: "The challenge does not exist or is no longer available.",
  CHALLENGE_EXPIRED: "The challenge has expired. Request a new one.",
  WRONG_DIRECTION: "The performed direction did not match the challenge.",
  TOO_FAST: "The response arrived too quickly.",
  TOO_SLOW: "The response arrived too slowly.",
  MOVEMENT_TOO_SHORT: "The pointer movement was too short.",
  TOKEN_INVALID: "The guard token is missing or invalid.",
  TOKEN_NOT_FOUND: "The guard token does not exist or was already used.",
  TOKEN_EXPIRED: "The guard token has expired.",
  TOKEN_ALREADY_USED: "The guard token was already used.",
  ACTION_MISMATCH: "The guard token was issued for a different action.",
  RISK_DENIED: "The interaction was rejected by the risk policy.",
  CHALLENGE_AGAIN: "The interaction could not be trusted. Request a new challenge and retry.",
};

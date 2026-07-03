/** Default lifetime of a challenge before it can no longer be answered. */
export const DEFAULT_CHALLENGE_TTL_MS = 120_000;

/** Default lifetime of an issued guard token. */
export const DEFAULT_TOKEN_TTL_MS = 180_000;

/** A challenge is deleted once this many wrong-direction answers accumulate. */
export const MAX_FAILED_ATTEMPTS = 2;

/**
 * Challenges stay in the store this long past their logical expiry so that
 * verification can answer CHALLENGE_EXPIRED instead of the less helpful
 * CHALLENGE_NOT_FOUND. Expiry is always enforced against `expiresAt`.
 */
export const CHALLENGE_EVICTION_GRACE_MS = 60_000;

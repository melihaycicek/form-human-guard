import type { GuardErrorCode } from "../core/errors";
import type { GuardTokenPayload } from "../core/types";
import type { GuardStore } from "../stores/Store";
import { decodePayload, safeEqualStrings, signData } from "./crypto";

const MAX_TOKEN_LENGTH = 4096;

export interface VerifyGuardTokenOptions {
  store: GuardStore;
  secret: string;
  token: string;
  /** If set, the token must have been issued for this action. */
  action?: string;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

export type VerifyGuardTokenResult =
  | { ok: true; payload: GuardTokenPayload }
  | { ok: false; code: GuardErrorCode };

/**
 * Verify and CONSUME a guard token. Checks, in order: shape, signature
 * (constant-time), expiry, presence in the store (one-time use), action
 * binding. The token is deleted on success, so a second verification of the
 * same token fails with TOKEN_NOT_FOUND.
 */
export async function verifyGuardToken(
  options: VerifyGuardTokenOptions
): Promise<VerifyGuardTokenResult> {
  const { store, secret, token, action } = options;
  const now = options.now ?? Date.now();

  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const encoded = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expectedSignature = signData(encoded, secret);
  if (!safeEqualStrings(signature, expectedSignature)) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const payload = decodePayload<GuardTokenPayload>(encoded);
  if (
    payload === null ||
    typeof payload !== "object" ||
    typeof payload.jti !== "string" ||
    typeof payload.challengeId !== "string" ||
    payload.mode !== "direction" ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number"
  ) {
    return { ok: false, code: "TOKEN_INVALID" };
  }

  if (now > payload.expiresAt) {
    return { ok: false, code: "TOKEN_EXPIRED" };
  }

  const stored = await store.getToken(payload.jti);
  if (!stored) {
    // Never issued, evicted by TTL, or already consumed.
    return { ok: false, code: "TOKEN_NOT_FOUND" };
  }

  if ((payload.action ?? null) !== (action ?? null)) {
    return { ok: false, code: "ACTION_MISMATCH" };
  }

  await store.deleteToken(payload.jti);
  return { ok: true, payload };
}

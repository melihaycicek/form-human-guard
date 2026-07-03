import { DEFAULT_TOKEN_TTL_MS } from "../core/constants";
import { randomId } from "../core/random";
import type { GuardTokenPayload } from "../core/types";
import type { GuardStore } from "../stores/Store";
import { encodePayload, signData } from "./crypto";

export interface IssueGuardTokenOptions {
  store: GuardStore;
  secret: string;
  challengeId: string;
  action?: string;
  tokenTtlMs?: number;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

export interface IssuedGuardToken {
  token: string;
  payload: GuardTokenPayload;
}

/**
 * Issue a short-lived, one-time guard token: `base64url(payload).signature`,
 * HMAC-SHA256 signed with the server secret. The token is stored under its
 * `jti` and deleted on first successful verification.
 */
export async function issueGuardToken(options: IssueGuardTokenOptions): Promise<IssuedGuardToken> {
  const now = options.now ?? Date.now();
  const tokenTtlMs = options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;

  const payload: GuardTokenPayload = {
    jti: randomId(),
    challengeId: options.challengeId,
    mode: "direction",
    ...(options.action !== undefined ? { action: options.action } : {}),
    issuedAt: now,
    expiresAt: now + tokenTtlMs,
  };

  const encoded = encodePayload(payload);
  const signature = signData(encoded, options.secret);
  await options.store.setToken(payload.jti, payload, tokenTtlMs);

  return { token: `${encoded}.${signature}`, payload };
}

import type { GuardErrorCode } from "../core/errors";
import type { Direction, GuardTokenPayload, InputType } from "../core/types";
import type { DirectionMatchClientSignals } from "../modes/direction-match/directionMatch.types";
import type { GuardStore } from "../stores/Store";
import type { RiskAssessment, RiskConfig } from "./risk/types";
import { verifyDirectionChallenge } from "./verifyChallenge";
import { verifyDirectionMatchChallenge } from "./verifyDirectionMatch";

/**
 * Superset of the per-mode verify payloads. The relevant fields are selected
 * by the stored challenge's mode, never by anything the client claims.
 */
export interface GuardVerifyRequest {
  challengeId: string;
  direction: Direction;
  inputType: InputType;
  /** direction mode only. */
  pointerDistance?: number;
  /** direction-match mode only; validated server-side. */
  signals?: DirectionMatchClientSignals;
  clientDurationMs?: number;
}

export interface VerifyGuardResponseOptions {
  store: GuardStore;
  secret: string;
  response: GuardVerifyRequest;
  action?: string;
  tokenTtlMs?: number;
  /** Applies to direction-match verifications only. */
  risk?: RiskConfig;
  /** Override the clock (tests). Defaults to Date.now(). */
  now?: number;
}

export type VerifyGuardResponseResult =
  | { ok: true; token: string; payload: GuardTokenPayload; risk?: RiskAssessment }
  | { ok: false; code: GuardErrorCode; risk?: RiskAssessment };

/**
 * Mode-dispatching verification: looks up the stored challenge and routes to
 * the matching verifier. The v0.1 direction flow goes through
 * `verifyDirectionChallenge` unchanged; direction-match adds signal
 * validation and rule-based risk scoring.
 */
export async function verifyGuardResponse(
  options: VerifyGuardResponseOptions
): Promise<VerifyGuardResponseResult> {
  const { response } = options;
  const challenge = await options.store.getChallenge(response.challengeId);
  if (!challenge) {
    return { ok: false, code: "CHALLENGE_NOT_FOUND" };
  }

  if (challenge.mode === "direction-match") {
    return verifyDirectionMatchChallenge({
      store: options.store,
      secret: options.secret,
      response: {
        challengeId: response.challengeId,
        direction: response.direction,
        inputType: response.inputType,
        signals: response.signals,
        clientDurationMs: response.clientDurationMs,
      },
      action: options.action,
      tokenTtlMs: options.tokenTtlMs,
      risk: options.risk,
      now: options.now,
    });
  }

  return verifyDirectionChallenge({
    store: options.store,
    secret: options.secret,
    response: {
      challengeId: response.challengeId,
      direction: response.direction,
      inputType: response.inputType,
      pointerDistance: response.pointerDistance,
      clientDurationMs: response.clientDurationMs,
    },
    action: options.action,
    tokenTtlMs: options.tokenTtlMs,
    now: options.now,
  });
}

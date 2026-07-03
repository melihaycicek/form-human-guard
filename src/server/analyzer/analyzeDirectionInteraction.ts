import type { DifficultyConfig } from "../../core/difficulty";
import type { GuardErrorCode } from "../../core/errors";
import type { InputType } from "../../core/types";

export interface DirectionInteractionInput {
  /** Computed server-side from the challenge's createdAt — never client-supplied. */
  serverElapsedMs: number;
  pointerDistance?: number;
  inputType: InputType;
  config: DifficultyConfig;
}

export interface InteractionCheckResult {
  ok: boolean;
  reasons: GuardErrorCode[];
  signals: {
    serverElapsedMs: number;
    pointerDistance?: number;
    inputType: InputType;
  };
}

type InteractionCheck = (input: DirectionInteractionInput) => GuardErrorCode | null;

const checkMinDuration: InteractionCheck = ({ serverElapsedMs, config }) =>
  serverElapsedMs >= config.minDurationMs ? null : "TOO_FAST";

const checkMaxDuration: InteractionCheck = ({ serverElapsedMs, config }) =>
  serverElapsedMs <= config.maxDurationMs ? null : "TOO_SLOW";

const checkPointerDistance: InteractionCheck = ({ inputType, pointerDistance, config }) => {
  if (inputType === "keyboard") {
    // Accessibility: keyboard gestures have no pointer path to measure.
    return null;
  }
  return (pointerDistance ?? 0) >= config.minPointerDistance ? null : "MOVEMENT_TOO_SHORT";
};

/** Ordered hard checks. Future checks are appended to this list. */
const checks: InteractionCheck[] = [checkMinDuration, checkMaxDuration, checkPointerDistance];

export function analyzeDirectionInteraction(
  input: DirectionInteractionInput
): InteractionCheckResult {
  const reasons = checks
    .map((check) => check(input))
    .filter((reason): reason is GuardErrorCode => reason !== null);

  return {
    ok: reasons.length === 0,
    reasons,
    signals: {
      serverElapsedMs: input.serverElapsedMs,
      pointerDistance: input.pointerDistance,
      inputType: input.inputType,
    },
  };
}

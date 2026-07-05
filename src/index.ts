// Framework-agnostic, isomorphic surface. Use the subpath entries for the
// framework pieces: form-human-guard/react, /server, /express, /stores.
export type {
  Direction,
  Difficulty,
  GuardMode,
  InputType,
  StoredChallenge,
  StoredToken,
  GuardTokenPayload,
} from "./core/types";
export { GUARD_MODES, isGuardMode } from "./core/types";
export type { GuardErrorCode } from "./core/errors";
export { errorMessages } from "./core/errors";
export {
  DEFAULT_CHALLENGE_TTL_MS,
  DEFAULT_TOKEN_TTL_MS,
  MAX_FAILED_ATTEMPTS,
} from "./core/constants";
export type { DifficultyConfig, DirectionMatchDifficultyConfig } from "./core/difficulty";
export {
  difficultyConfig,
  directionMatchDifficultyConfig,
  DIFFICULTIES,
  isDifficulty,
} from "./core/difficulty";
export type {
  PublicDirectionChallenge,
  DirectionResponse,
} from "./modes/direction/direction.types";
export {
  DIRECTIONS,
  directionSymbolMap,
  directionLabelMap,
} from "./modes/direction/direction.constants";
export {
  angleToDirection,
  directionFromDelta,
  isDirection,
} from "./modes/direction/direction.utils";
export type {
  PublicDirectionMatchChallenge,
  DirectionMatchResponse,
  DirectionMatchClientSignals,
} from "./modes/direction-match/directionMatch.types";
export {
  DIRECTION_RING,
  rotateDirection,
  ringDistance,
} from "./modes/direction-match/directionMatch.utils";

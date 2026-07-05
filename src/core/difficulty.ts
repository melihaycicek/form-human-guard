import type { Difficulty } from "./types";

export interface DifficultyConfig {
  minDurationMs: number;
  maxDurationMs: number;
  minPointerDistance: number;
}

export const difficultyConfig: Record<Difficulty, DifficultyConfig> = {
  easy: { minDurationMs: 150, maxDurationMs: 10_000, minPointerDistance: 20 },
  medium: { minDurationMs: 250, maxDurationMs: 8_000, minPointerDistance: 30 },
  strict: { minDurationMs: 350, maxDurationMs: 6_000, minPointerDistance: 40 },
};

/** Timing thresholds for the direction-match (rotate to target) mode. There
 * is no pointer-distance check: the interaction is stepwise rotation. */
export interface DirectionMatchDifficultyConfig {
  minDurationMs: number;
  maxDurationMs: number;
}

export const directionMatchDifficultyConfig: Record<Difficulty, DirectionMatchDifficultyConfig> = {
  easy: { minDurationMs: 400, maxDurationMs: 20_000 },
  medium: { minDurationMs: 600, maxDurationMs: 15_000 },
  strict: { minDurationMs: 800, maxDurationMs: 12_000 },
};

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "strict"];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

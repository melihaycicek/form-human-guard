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

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "strict"];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

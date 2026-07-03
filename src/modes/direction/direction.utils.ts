import type { Direction } from "../../core/types";
import { DIRECTIONS } from "./direction.constants";

/**
 * Counter-clockwise sector order starting at 0° = right, in mathematical
 * convention (y axis pointing up). Each direction owns a 45° sector centred
 * on its angle; an angle exactly on a boundary (e.g. 22.5°) belongs to the
 * counter-clockwise neighbour (round-half-up).
 */
const SECTOR_ORDER: readonly Direction[] = [
  "right",
  "up-right",
  "up",
  "up-left",
  "left",
  "down-left",
  "down",
  "down-right",
];

/** Map an angle in degrees (math convention, y up) to one of 8 directions. */
export function angleToDirection(angleDeg: number): Direction {
  const normalized = ((angleDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return SECTOR_ORDER[index] as Direction;
}

/**
 * Map a movement delta in screen coordinates (y grows downward) to a
 * direction, using the angle of the start→end vector — not naive dx/dy signs.
 */
export function directionFromDelta(dx: number, dy: number): Direction {
  const angleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  return angleToDirection(angleDeg);
}

export function gestureDistance(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && (DIRECTIONS as readonly string[]).includes(value);
}

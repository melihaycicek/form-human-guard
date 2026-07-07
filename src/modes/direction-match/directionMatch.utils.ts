import type { Direction } from "../../core/types";
import { DIRECTIONS } from "../direction/direction.constants";

/**
 * The 8 directions as a clockwise ring (up → up-right → … → up-left).
 * Rotation and distance are defined on this ring.
 */
export const DIRECTION_RING: readonly Direction[] = DIRECTIONS;

/** Rotate a direction by `steps` on the ring (positive = clockwise). */
export function rotateDirection(direction: Direction, steps: number): Direction {
  const index = DIRECTION_RING.indexOf(direction);
  const next = (((index + steps) % DIRECTION_RING.length) + DIRECTION_RING.length) % DIRECTION_RING.length;
  return DIRECTION_RING[next] as Direction;
}

/** Minimum number of single rotation steps between two directions (0–4). */
export function ringDistance(a: Direction, b: Direction): number {
  const diff = Math.abs(DIRECTION_RING.indexOf(a) - DIRECTION_RING.indexOf(b));
  return Math.min(diff, DIRECTION_RING.length - diff);
}

import type { Direction } from "../../core/types";
import { directionSymbolMap } from "../../modes/direction/direction.constants";

/** Rotation in degrees applied to the base ArrowIcon (which points up). */
export const directionRotationMap: Record<Direction, number> = {
  up: 0,
  "up-right": 45,
  right: 90,
  "down-right": 135,
  down: 180,
  "down-left": 225,
  left: 270,
  "up-left": 315,
};

export { directionSymbolMap };

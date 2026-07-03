import type { Direction } from "../../core/types";
import { ArrowIcon } from "./ArrowIcon";
import { directionRotationMap } from "./directionIconMap";

export interface DirectionIconProps {
  direction: Direction;
  size?: number;
  className?: string;
}

export function DirectionIcon({ direction, size = 48, className }: DirectionIconProps) {
  return <ArrowIcon size={size} rotation={directionRotationMap[direction]} className={className} />;
}

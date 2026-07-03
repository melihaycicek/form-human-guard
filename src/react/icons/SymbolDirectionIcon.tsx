import type { Direction } from "../../core/types";
import { directionSymbolMap } from "./directionIconMap";

export interface SymbolDirectionIconProps {
  direction: Direction;
  size?: number;
  className?: string;
}

export function SymbolDirectionIcon({ direction, size = 48, className }: SymbolDirectionIconProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1, display: "block", userSelect: "none" }}
    >
      {directionSymbolMap[direction]}
    </span>
  );
}

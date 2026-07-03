import type { Direction } from "../../core/types";

export const DIRECTIONS: readonly Direction[] = [
  "up",
  "up-right",
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
];

export const directionSymbolMap: Record<Direction, string> = {
  up: "↑",
  right: "→",
  down: "↓",
  left: "←",
  "up-right": "↗",
  "up-left": "↖",
  "down-right": "↘",
  "down-left": "↙",
};

/** Spoken-friendly phrases for accessible instruction text. */
export const directionLabelMap: Record<Direction, string> = {
  up: "up",
  right: "to the right",
  down: "down",
  left: "to the left",
  "up-right": "diagonally up and to the right",
  "up-left": "diagonally up and to the left",
  "down-right": "diagonally down and to the right",
  "down-left": "diagonally down and to the left",
};

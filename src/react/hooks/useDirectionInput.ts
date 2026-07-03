import { useCallback, useEffect, useRef } from "react";
import type { Direction } from "../../core/types";

export interface KeyboardGesture {
  direction: Direction;
  durationMs: number;
  inputType: "keyboard";
}

type VerticalKey = "up" | "down";
type HorizontalKey = "left" | "right";

interface KeyboardGestureState {
  vertical: VerticalKey | null;
  horizontal: HorizontalKey | null;
  startedAt: number;
}

const ARROW_KEYS: Record<string, VerticalKey | HorizontalKey> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * How long after the last arrow key is released before the gesture commits.
 * The window lets arrows be combined for diagonals either by holding them
 * together or by pressing them in quick succession.
 */
const COMMIT_DELAY_MS = 350;

function combine(vertical: VerticalKey | null, horizontal: HorizontalKey | null): Direction | null {
  if (vertical && horizontal) {
    return `${vertical}-${horizontal}` as Direction;
  }
  return vertical ?? horizontal ?? null;
}

/**
 * Keyboard direction entry. Convention: arrow keys pressed within one
 * gesture combine per axis (the latest key on an axis wins, so a correction
 * like ↑ then ↓ resolves to down); the gesture commits COMMIT_DELAY_MS after
 * all keys are released. Escape cancels the pending gesture.
 */
export function useDirectionInput(
  onGesture: (gesture: KeyboardGesture) => void,
  enabled: boolean
) {
  const gestureRef = useRef<KeyboardGestureState | null>(null);
  const pressedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const reset = useCallback(() => {
    gestureRef.current = null;
    pressedRef.current.clear();
    clearTimer();
  }, [clearTimer]);

  const commit = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    timerRef.current = null;
    if (!gesture) {
      return;
    }
    const direction = combine(gesture.vertical, gesture.horizontal);
    if (!direction) {
      return;
    }
    onGesture({
      direction,
      durationMs: Date.now() - gesture.startedAt,
      inputType: "keyboard",
    });
  }, [onGesture]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      if (event.key === "Escape") {
        reset();
        return;
      }
      const key = ARROW_KEYS[event.key];
      if (!key) {
        return;
      }
      event.preventDefault();
      clearTimer();
      pressedRef.current.add(event.key);
      if (!gestureRef.current) {
        gestureRef.current = { vertical: null, horizontal: null, startedAt: Date.now() };
      }
      if (key === "up" || key === "down") {
        gestureRef.current.vertical = key;
      } else {
        gestureRef.current.horizontal = key;
      }
    },
    [enabled, reset, clearTimer]
  );

  const onKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!ARROW_KEYS[event.key]) {
        return;
      }
      pressedRef.current.delete(event.key);
      if (pressedRef.current.size === 0 && gestureRef.current) {
        clearTimer();
        timerRef.current = setTimeout(commit, COMMIT_DELAY_MS);
      }
    },
    [commit, clearTimer]
  );

  const onBlur = useCallback(() => reset(), [reset]);

  return { handlers: { onKeyDown, onKeyUp, onBlur } };
}

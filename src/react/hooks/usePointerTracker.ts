import { useCallback, useRef, useState } from "react";
import type { Direction } from "../../core/types";
import { directionFromDelta, gestureDistance } from "../../modes/direction/direction.utils";

export interface PointerGesture {
  direction: Direction;
  distance: number;
  durationMs: number;
  inputType: "mouse" | "touch";
}

interface PointerStart {
  x: number;
  y: number;
  startedAt: number;
  pointerId: number;
  pointerType: string;
}

/** Movements shorter than this are treated as accidental taps and ignored. */
const TAP_THRESHOLD_PX = 4;

/**
 * Tracks a single pointer drag on the guard pad. Direction is derived from
 * the angle of the start→end vector (Math.atan2 over 45° sectors).
 */
export function usePointerTracker(
  onGesture: (gesture: PointerGesture) => void,
  enabled: boolean
) {
  const startRef = useRef<PointerStart | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        startedAt: Date.now(),
        pointerId: event.pointerId,
        pointerType: event.pointerType,
      };
      setDragging(true);
    },
    [enabled]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      startRef.current = null;
      setDragging(false);
      if (!start || start.pointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const distance = gestureDistance(dx, dy);
      if (distance < TAP_THRESHOLD_PX) {
        return;
      }
      onGesture({
        direction: directionFromDelta(dx, dy),
        distance,
        durationMs: Date.now() - start.startedAt,
        inputType: start.pointerType === "mouse" ? "mouse" : "touch",
      });
    },
    [onGesture]
  );

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
    setDragging(false);
  }, []);

  return {
    dragging,
    handlers: { onPointerDown, onPointerUp, onPointerCancel },
  };
}

import { useCallback, useRef, useState } from "react";
import type { Direction, InputType } from "../../core/types";
import { directionLabelMap } from "../../modes/direction/direction.constants";
import type {
  DirectionMatchClientSignals,
  PublicDirectionMatchChallenge,
} from "../../modes/direction-match/directionMatch.types";
import { rotateDirection } from "../../modes/direction-match/directionMatch.utils";
import { DirectionIcon } from "../icons/DirectionIcon";

export interface DirectionMatchConfirmMeta {
  inputType: InputType;
  signals: DirectionMatchClientSignals;
  clientDurationMs: number;
}

export interface DirectionMatchPanelProps {
  challenge: PublicDirectionMatchChallenge;
  /** Disables the controls while a verification request is in flight. */
  busy?: boolean;
  onConfirm: (direction: Direction, meta: DirectionMatchConfirmMeta) => void;
}

/**
 * The rotate-to-match interaction. Renders the target direction and the
 * current direction; the user rotates the current arrow left/right (buttons
 * or arrow keys) until it matches, then confirms. Collects only lightweight
 * counters as interaction signals — never coordinates.
 *
 * Mount with `key={challenge.challengeId}` so a fresh challenge resets state.
 */
export function DirectionMatchPanel({ challenge, busy = false, onConfirm }: DirectionMatchPanelProps) {
  const [current, setCurrent] = useState<Direction>(challenge.initialDirection);
  const startedAtRef = useRef(Date.now());
  const rotateCountRef = useRef(0);
  const eventCountRef = useRef(0);
  const directionChangeCountRef = useRef(0);
  const lastRotationRef = useRef<0 | 1 | -1>(0);
  const inputMethodRef = useRef<InputType>("mouse");

  const rotate = useCallback(
    (step: 1 | -1) => {
      if (busy) {
        return;
      }
      rotateCountRef.current += 1;
      eventCountRef.current += 1;
      if (lastRotationRef.current !== 0 && lastRotationRef.current !== step) {
        directionChangeCountRef.current += 1;
      }
      lastRotationRef.current = step;
      setCurrent((direction) => rotateDirection(direction, step));
    },
    [busy]
  );

  const confirm = useCallback(() => {
    if (busy) {
      return;
    }
    eventCountRef.current += 1;
    onConfirm(current, {
      inputType: inputMethodRef.current,
      signals: {
        rotateCount: rotateCountRef.current,
        eventCount: eventCountRef.current,
        directionChangeCount: directionChangeCountRef.current,
      },
      clientDurationMs: Date.now() - startedAtRef.current,
    });
  }, [busy, current, onConfirm]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    inputMethodRef.current = event.pointerType === "mouse" ? "mouse" : "touch";
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        inputMethodRef.current = "keyboard";
        rotate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        inputMethodRef.current = "keyboard";
        rotate(1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        inputMethodRef.current = "keyboard";
        confirm();
      }
    },
    [rotate, confirm]
  );

  const matches = current === challenge.targetDirection;

  return (
    <div onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
      <div className="fhg-ov-stage">
        <div className="fhg-ov-arrow fhg-ov-target">
          <DirectionIcon direction={challenge.targetDirection} size={36} />
          <span className="fhg-ov-arrow-label">Target</span>
        </div>
        <div className="fhg-ov-arrow fhg-ov-current">
          <DirectionIcon direction={current} size={56} />
          <span className="fhg-ov-arrow-label">Yours</span>
        </div>
      </div>
      <div className="fhg-ov-controls">
        <button
          type="button"
          className="fhg-ov-btn"
          disabled={busy}
          onClick={() => rotate(-1)}
          aria-label="Rotate counter-clockwise"
        >
          ⟲
        </button>
        <button
          type="button"
          className="fhg-ov-btn"
          disabled={busy}
          onClick={() => rotate(1)}
          aria-label="Rotate clockwise"
        >
          ⟳
        </button>
        <button
          type="button"
          className="fhg-ov-btn fhg-ov-btn--primary"
          disabled={busy}
          onClick={confirm}
        >
          Confirm
        </button>
      </div>
      <p className="fhg-ov-status" aria-live="polite">
        {`Your arrow points ${directionLabelMap[current]}.` + (matches ? " It matches the target." : "")}
      </p>
    </div>
  );
}

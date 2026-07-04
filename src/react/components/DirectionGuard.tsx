import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Difficulty, Direction, InputType } from "../../core/types";
import { directionLabelMap } from "../../modes/direction/direction.constants";
import type { DirectionResponse } from "../../modes/direction/direction.types";
import { useDirectionInput } from "../hooks/useDirectionInput";
import { useGuardChallenge } from "../hooks/useGuardChallenge";
import { usePointerTracker } from "../hooks/usePointerTracker";
import { DirectionIcon } from "../icons/DirectionIcon";
import { directionRotationMap } from "../icons/directionIconMap";
import { SymbolDirectionIcon } from "../icons/SymbolDirectionIcon";

export type DirectionIconType = "svg" | "symbol";
export type GuardSize = "sm" | "md" | "lg" | number;

export interface DirectionGuardProps {
  /** Base path of the guard routes. Default "/guard". */
  endpoint?: string;
  /** UI hint sent with the challenge request; the server is authoritative. */
  difficulty?: Difficulty;
  iconType?: DirectionIconType;
  size?: GuardSize;
  disabled?: boolean;
  className?: string;
  onVerified?: (token: string) => void;
  onError?: (error: Error) => void;
  renderDirection?: (props: {
    direction: Direction;
    size: number;
    rotation: number;
  }) => React.ReactNode;
}

interface GuardGesture {
  direction: Direction;
  inputType: InputType;
  distance?: number;
  durationMs: number;
}

const sizeMap: Record<"sm" | "md" | "lg", number> = { sm: 32, md: 48, lg: 64 };

type GuardStatus = "idle" | "verifying" | "success" | "failed";

export function DirectionGuard({
  endpoint = "/guard",
  difficulty = "easy",
  iconType = "svg",
  size = "md",
  disabled = false,
  className,
  onVerified,
  onError,
  renderDirection,
}: DirectionGuardProps) {
  const iconSize = typeof size === "number" ? size : sizeMap[size];
  const instructionId = useId();
  const { challenge, loading, error: challengeError, refresh } = useGuardChallenge({
    endpoint,
    difficulty,
  });
  const [status, setStatus] = useState<GuardStatus>("idle");
  const [message, setMessage] = useState("");

  const challengeRef = useRef(challenge);
  challengeRef.current = challenge;
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (challengeError) {
      onError?.(challengeError);
      setMessage("Could not load the challenge. Use the new challenge button to retry.");
    }
  }, [challengeError, onError]);

  const submit = useCallback(
    async (gesture: GuardGesture) => {
      const current = challengeRef.current;
      if (!current || statusRef.current === "verifying" || statusRef.current === "success") {
        return;
      }
      setStatus("verifying");
      setMessage("Checking your answer.");
      try {
        const payload: DirectionResponse = {
          challengeId: current.challengeId,
          direction: gesture.direction,
          inputType: gesture.inputType,
          ...(gesture.distance !== undefined
            ? { pointerDistance: Math.round(gesture.distance) }
            : {}),
          clientDurationMs: Math.round(gesture.durationMs),
        };
        const res = await fetch(`${endpoint}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const data: unknown = await res.json().catch(() => null);
        const token =
          res.ok &&
          typeof data === "object" &&
          data !== null &&
          (data as { ok?: unknown }).ok === true &&
          typeof (data as { token?: unknown }).token === "string"
            ? ((data as { token: string }).token)
            : null;

        if (token) {
          setStatus("success");
          setMessage("Verified. You can submit the form now.");
          onVerified?.(token);
          return;
        }
        setStatus("failed");
        setMessage("That did not match. A new challenge has loaded, try again.");
        refresh();
      } catch (err: unknown) {
        setStatus("failed");
        setMessage("Verification failed. A new challenge has loaded, try again.");
        onError?.(err instanceof Error ? err : new Error(String(err)));
        refresh();
      }
    },
    [endpoint, onVerified, onError, refresh]
  );

  const interactive =
    !disabled && !loading && challenge !== null && status !== "verifying" && status !== "success";

  const { dragging, handlers: pointerHandlers } = usePointerTracker(submit, interactive);
  const { handlers: keyboardHandlers } = useDirectionInput(submit, interactive);

  const handleRefresh = useCallback(() => {
    setStatus("idle");
    setMessage("");
    refresh();
  }, [refresh]);

  const instruction = challenge
    ? `Drag inside the box, or press the arrow keys, to point ${directionLabelMap[challenge.direction]}. ` +
      "For diagonal directions hold or quickly press two arrow keys, for example up and right."
    : loading
      ? "Loading challenge."
      : "Challenge unavailable.";

  const padSizePx = Math.max(44, Math.round(iconSize * 2.5));
  const effectiveStatus: string = loading ? "loading" : status;

  const icon =
    challenge !== null
      ? renderDirection
        ? renderDirection({
            direction: challenge.direction,
            size: iconSize,
            rotation: directionRotationMap[challenge.direction],
          })
        : iconType === "symbol"
          ? <SymbolDirectionIcon direction={challenge.direction} size={iconSize} />
          : <DirectionIcon direction={challenge.direction} size={iconSize} />
      : null;

  return (
    <div
      className={className ? `fhg ${className}` : "fhg"}
      data-status={effectiveStatus}
      style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}
    >
      <p className="fhg-instruction" id={instructionId} style={{ margin: 0 }}>
        {instruction}
      </p>
      <div
        className="fhg-pad"
        role="application"
        aria-roledescription="direction challenge"
        aria-describedby={instructionId}
        aria-disabled={!interactive}
        tabIndex={disabled ? -1 : 0}
        style={{
          width: padSizePx,
          height: padSizePx,
          minWidth: 44,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          border: "1px solid currentColor",
          borderRadius: 8,
          touchAction: "none",
          userSelect: "none",
          cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
        }}
        {...pointerHandlers}
        {...keyboardHandlers}
      >
        {status === "success" ? (
          <span className="fhg-success-mark" aria-hidden="true" style={{ fontSize: iconSize }}>
            ✓
          </span>
        ) : (
          icon
        )}
      </div>
      <button
        type="button"
        className="fhg-refresh"
        onClick={handleRefresh}
        disabled={disabled || loading || status === "verifying" || status === "success"}
      >
        New challenge
      </button>
      <p className="fhg-status" role="status" aria-live="polite" style={{ margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

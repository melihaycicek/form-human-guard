import { useCallback, useEffect, useId, useRef } from "react";
import type { Direction } from "../../core/types";
import { directionLabelMap } from "../../modes/direction/direction.constants";
import type { PublicDirectionMatchChallenge } from "../../modes/direction-match/directionMatch.types";
import type { DirectionMatchConfirmMeta } from "./DirectionMatchPanel";
import { DirectionMatchPanel } from "./DirectionMatchPanel";

export type GuardOverlayStatus = "loading" | "active" | "verifying" | "error";

export interface GuardOverlayProps {
  status: GuardOverlayStatus;
  message: string;
  challenge: PublicDirectionMatchChallenge | null;
  onConfirm: (direction: Direction, meta: DirectionMatchConfirmMeta) => void;
  onCancel: () => void;
}

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Modal dialog rendered inside the closed ShadowRoot. Manages focus (initial
 * focus, Tab trap, Escape to cancel) locally — document-level tooling cannot
 * reach inside the closed root, so everything lives on the dialog itself.
 */
export function GuardOverlay({ status, message, challenge, onConfirm, onCancel }: GuardOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog).focus();
  }, [challenge?.challengeId]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const firstEl = focusable[0] as HTMLElement;
      const lastEl = focusable[focusable.length - 1] as HTMLElement;
      const active = dialog.getRootNode() instanceof ShadowRoot
        ? (dialog.getRootNode() as ShadowRoot).activeElement
        : document.activeElement;
      if (event.shiftKey && (active === firstEl || active === dialog)) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    },
    [onCancel]
  );

  return (
    <div className="fhg-ov-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        className="fhg-ov-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 className="fhg-ov-title" id={titleId}>
          Quick check before you submit
        </h2>
        <p className="fhg-ov-desc" id={descId}>
          {challenge
            ? `Rotate your arrow until it points ${directionLabelMap[challenge.targetDirection]}, ` +
              "then confirm. Use the buttons or the left and right arrow keys."
            : status === "error"
              ? "The challenge could not be loaded."
              : "Loading the challenge…"}
        </p>
        {challenge && (
          <DirectionMatchPanel
            key={challenge.challengeId}
            challenge={challenge}
            busy={status === "verifying"}
            onConfirm={onConfirm}
          />
        )}
        <div className="fhg-ov-footer">
          <button type="button" className="fhg-ov-btn" onClick={onCancel}>
            Cancel
          </button>
          <p className="fhg-ov-status" role="status" aria-live="polite">
            {status === "verifying" ? "Checking…" : message}
          </p>
        </div>
      </div>
    </div>
  );
}

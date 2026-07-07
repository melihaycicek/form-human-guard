import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, Direction } from "../../core/types";
import type { PublicDirectionMatchChallenge } from "../../modes/direction-match/directionMatch.types";
import type { DirectionMatchConfirmMeta } from "../overlay/DirectionMatchPanel";

export type SubmitGuardStatus = "idle" | "loading" | "active" | "verifying" | "error";

export interface UseSubmitGuardOptions {
  /** Base path of the guard routes. Default "/guard". */
  endpoint?: string;
  /** UI hint sent with the challenge request; the server is authoritative. */
  difficulty?: Difficulty;
  /** When true the guard does not intercept submits. */
  disabled?: boolean;
  onToken?: (token: string) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

export interface SubmitGuardController {
  /** Whether the guard flow is currently active (overlay should be shown). */
  open: boolean;
  status: SubmitGuardStatus;
  /** User-facing status message for the current state. */
  message: string;
  challenge: PublicDirectionMatchChallenge | null;
  /** The one-time guard token after a successful verification. */
  token: string | null;
  /**
   * Callback ref for a (hidden) input INSIDE the form to protect. Registers
   * the submit interceptor on `input.form` and carries the token value.
   */
  inputRef: (element: HTMLInputElement | null) => void;
  /** Start the flow manually (the submit interceptor calls this for you). */
  begin: () => void;
  /** Verify the user's final direction. */
  confirm: (direction: Direction, meta: DirectionMatchConfirmMeta) => void;
  /** Abort the flow. The intercepted submit stays cancelled. */
  cancel: () => void;
}

/**
 * Headless submit-time guard flow:
 *
 * 1. A capture-phase submit listener on the surrounding form intercepts the
 *    submit (preventDefault + stopPropagation) and starts the flow.
 * 2. A direction-match challenge is fetched at submit time.
 * 3. `confirm()` posts the user's final direction plus lightweight
 *    interaction signals; on success the server's one-time token is stored
 *    and the form is programmatically resubmitted, which the interceptor
 *    lets through exactly once.
 * 4. On failure a fresh challenge is loaded; on `cancel()` nothing is
 *    submitted.
 *
 * `SubmitGuard` wires this controller to the closed-ShadowRoot overlay; use
 * the hook directly only if you render your own challenge UI.
 */
export function useSubmitGuard(options: UseSubmitGuardOptions = {}): SubmitGuardController {
  const endpoint = options.endpoint ?? "/guard";
  const difficulty = options.difficulty ?? "easy";
  const disabled = options.disabled ?? false;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SubmitGuardStatus>("idle");
  const [message, setMessage] = useState("");
  const [challenge, setChallenge] = useState<PublicDirectionMatchChallenge | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;
  const runIdRef = useRef(0);
  const bypassRef = useRef(false);
  const pendingResubmitRef = useRef(false);

  const onTokenRef = useRef(options.onToken);
  onTokenRef.current = options.onToken;
  const onCancelRef = useRef(options.onCancel);
  onCancelRef.current = options.onCancel;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const reportError = useCallback((err: unknown) => {
    onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
  }, []);

  const fetchChallenge = useCallback(
    async (runId: number) => {
      setStatus("loading");
      try {
        const res = await fetch(
          `${endpoint}/challenge?mode=direction-match&difficulty=${encodeURIComponent(difficulty)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          throw new Error(`Challenge request failed with status ${res.status}`);
        }
        const data = (await res.json()) as PublicDirectionMatchChallenge;
        if (runIdRef.current !== runId) {
          return;
        }
        setChallenge(data);
        setStatus("active");
      } catch (err: unknown) {
        if (runIdRef.current !== runId) {
          return;
        }
        setStatus("error");
        setMessage("The challenge could not be loaded.");
        reportError(err);
      }
    },
    [endpoint, difficulty, reportError]
  );

  const begin = useCallback(() => {
    if (statusRef.current !== "idle" && statusRef.current !== "error") {
      return;
    }
    runIdRef.current += 1;
    setToken(null);
    setChallenge(null);
    setMessage("");
    setOpen(true);
    void fetchChallenge(runIdRef.current);
  }, [fetchChallenge]);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    setOpen(false);
    setStatus("idle");
    setMessage("");
    setChallenge(null);
    onCancelRef.current?.();
  }, []);

  const confirm = useCallback(
    (direction: Direction, meta: DirectionMatchConfirmMeta) => {
      const current = challenge;
      if (!current || statusRef.current !== "active") {
        return;
      }
      const runId = runIdRef.current;
      setStatus("verifying");
      void (async () => {
        try {
          const res = await fetch(`${endpoint}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              challengeId: current.challengeId,
              direction,
              inputType: meta.inputType,
              signals: meta.signals,
              clientDurationMs: Math.round(meta.clientDurationMs),
            }),
          });
          const data: unknown = await res.json().catch(() => null);
          if (runIdRef.current !== runId) {
            return;
          }
          const issued =
            res.ok &&
            typeof data === "object" &&
            data !== null &&
            (data as { ok?: unknown }).ok === true &&
            typeof (data as { token?: unknown }).token === "string"
              ? (data as { token: string }).token
              : null;

          if (issued) {
            pendingResubmitRef.current = true;
            setToken(issued);
            setOpen(false);
            setStatus("idle");
            setMessage("");
            onTokenRef.current?.(issued);
            return;
          }

          const code =
            typeof data === "object" && data !== null &&
            typeof (data as { code?: unknown }).code === "string"
              ? (data as { code: string }).code
              : "UNKNOWN";
          setMessage(
            code === "WRONG_DIRECTION"
              ? "That was not the target direction. Here is a fresh challenge."
              : "That attempt was not accepted. Here is a fresh challenge."
          );
          runIdRef.current += 1;
          void fetchChallenge(runIdRef.current);
        } catch (err: unknown) {
          if (runIdRef.current !== runId) {
            return;
          }
          setStatus("error");
          setMessage("Verification failed. Cancel and try again.");
          reportError(err);
        }
      })();
    },
    [challenge, endpoint, fetchChallenge, reportError]
  );

  // Intercept real submits of the surrounding form (capture phase, so it
  // runs before the app's own submit handlers).
  useEffect(() => {
    const form = inputEl?.form ?? null;
    if (!form || disabled) {
      return;
    }
    const handler = (event: Event) => {
      if (bypassRef.current) {
        return; // our own programmatic resubmit
      }
      event.preventDefault();
      event.stopPropagation();
      begin();
    };
    form.addEventListener("submit", handler, true);
    return () => form.removeEventListener("submit", handler, true);
  }, [inputEl, disabled, begin]);

  // After a successful verification, resubmit the form once. The hidden
  // input already carries the token in the DOM at this point.
  useEffect(() => {
    if (!token || !pendingResubmitRef.current) {
      return;
    }
    pendingResubmitRef.current = false;
    const form = inputEl?.form ?? null;
    if (!form) {
      return;
    }
    bypassRef.current = true;
    try {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    } finally {
      bypassRef.current = false;
    }
  }, [token, inputEl]);

  const inputRef = useCallback((element: HTMLInputElement | null) => {
    setInputEl(element);
  }, []);

  return { open, status, message, challenge, token, inputRef, begin, confirm, cancel };
}

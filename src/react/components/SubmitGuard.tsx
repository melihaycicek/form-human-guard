import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Difficulty } from "../../core/types";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { GuardOverlay } from "../overlay/GuardOverlay";
import type { GuardOverlayStatus } from "../overlay/GuardOverlay";
import { overlayStyleText } from "../overlay/overlayStyles";
import { createGuardOverlayHost } from "../overlay/shadowHost";
import type { GuardOverlayHost } from "../overlay/shadowHost";
import { resolveGuardTheme, themeToCssVariables } from "../theme/themes";
import type { GuardTheme, GuardThemePreset } from "../theme/themes";

export interface SubmitGuardProps {
  /** Base path of the guard routes. Default "/guard". */
  endpoint?: string;
  /** UI hint sent with the challenge request; the server is authoritative. */
  difficulty?: Difficulty;
  /** Preset name or full theme object. Default "light". */
  theme?: GuardThemePreset | GuardTheme;
  /** Per-token overrides applied on top of the theme. */
  themeOverrides?: Partial<GuardTheme>;
  /** Name of the hidden input that carries the token. Default "guardToken". */
  tokenFieldName?: string;
  /** When true the guard does not intercept submits. */
  disabled?: boolean;
  onToken?: (token: string) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

interface OverlayInstance {
  host: GuardOverlayHost;
  reactRoot: Root;
}

/**
 * Invisible submit-time guard. Place it anywhere inside the form to protect:
 * it renders only a hidden token input. When the user submits, the submit is
 * intercepted and a direction-match challenge opens in a modal overlay
 * rendered inside a CLOSED ShadowRoot. On success the one-time guard token
 * lands in the hidden input and the original submit continues; on cancel or
 * failure the submit stays cancelled.
 */
export function SubmitGuard({
  endpoint = "/guard",
  difficulty = "easy",
  theme = "light",
  themeOverrides,
  tokenFieldName = "guardToken",
  disabled = false,
  onToken,
  onCancel,
  onError,
}: SubmitGuardProps) {
  const guard = useSubmitGuard({ endpoint, difficulty, disabled, onToken, onCancel, onError });

  const overlayRef = useRef<OverlayInstance | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const themeRef = useRef({ theme, themeOverrides });
  themeRef.current = { theme, themeOverrides };

  // Create/destroy the closed-ShadowRoot overlay with the flow. The overlay
  // content is a separate React root mounted inside the shadow boundary so
  // its events never depend on the host page's React tree.
  useEffect(() => {
    if (!guard.open) {
      return;
    }
    previousFocusRef.current = document.activeElement;
    const resolved = resolveGuardTheme(themeRef.current.theme, themeRef.current.themeOverrides);
    const host = createGuardOverlayHost(themeToCssVariables(resolved), overlayStyleText);
    const reactRoot = createRoot(host.container);
    overlayRef.current = { host, reactRoot };
    return () => {
      overlayRef.current = null;
      host.dispose();
      // Defer the secondary root's unmount: cleanup can run while the host
      // React tree is still rendering, and unmounting a root synchronously
      // from there is a race React warns about.
      setTimeout(() => reactRoot.unmount(), 0);
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [guard.open]);

  // Keep the overlay content in sync with the flow state.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !guard.open) {
      return;
    }
    overlay.reactRoot.render(
      <GuardOverlay
        status={(guard.status === "idle" ? "loading" : guard.status) as GuardOverlayStatus}
        message={guard.message}
        challenge={guard.challenge}
        onConfirm={guard.confirm}
        onCancel={guard.cancel}
      />
    );
  }, [guard.open, guard.status, guard.message, guard.challenge, guard.confirm, guard.cancel]);

  return (
    <input
      type="hidden"
      name={tokenFieldName}
      value={guard.token ?? ""}
      readOnly
      ref={guard.inputRef}
      data-fhg-token-input=""
    />
  );
}

// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicDirectionMatchChallenge } from "../src/modes/direction-match/directionMatch.types";
import { SubmitGuard } from "../src/react/components/SubmitGuard";
import { useSubmitGuard } from "../src/react/hooks/useSubmitGuard";
import type { SubmitGuardController } from "../src/react/hooks/useSubmitGuard";
import { DirectionMatchPanel } from "../src/react/overlay/DirectionMatchPanel";
import { GuardOverlay } from "../src/react/overlay/GuardOverlay";
import { createGuardOverlayHost } from "../src/react/overlay/shadowHost";
import { guardThemePresets, themeToCssVariables } from "../src/react/theme/themes";

function makeChallenge(
  overrides: Partial<PublicDirectionMatchChallenge> = {}
): PublicDirectionMatchChallenge {
  return {
    challengeId: "match-1",
    mode: "direction-match",
    targetDirection: "up",
    initialDirection: "down",
    difficulty: "easy",
    expiresAt: Date.now() + 120_000,
    ...overrides,
  };
}

type FetchResponse = { status?: number; body: unknown };

/** URL-pattern based fetch mock; challenge responses come from a queue. */
function mockFetch(challenges: PublicDirectionMatchChallenge[], verifyQueue: FetchResponse[]) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/challenge")) {
      const challenge = challenges.shift();
      if (!challenge) throw new Error("no challenge queued");
      return new Response(JSON.stringify(challenge), { status: 200 });
    }
    if (url.includes("/verify")) {
      const next = verifyQueue.shift();
      if (!next) throw new Error("no verify response queued");
      return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("createGuardOverlayHost (closed ShadowRoot)", () => {
  it("attaches a CLOSED shadow root: host.shadowRoot is null from outside", () => {
    const { host, container, dispose } = createGuardOverlayHost(
      themeToCssVariables(guardThemePresets.light),
      ".x{}"
    );
    expect(document.body.contains(host)).toBe(true);
    expect(host.shadowRoot).toBeNull(); // closed mode — the whole point
    // The factory still hands the render target to the component internals.
    expect(container.isConnected).toBe(true);
    expect(container.getRootNode()).not.toBe(document);

    dispose();
    expect(document.body.contains(host)).toBe(false);
  });

  it("applies theme CSS variables inside the shadow boundary", () => {
    const { container, dispose } = createGuardOverlayHost(
      themeToCssVariables(guardThemePresets.midnight),
      ""
    );
    expect(container.style.getPropertyValue("--fhg-accent")).toBe(
      guardThemePresets.midnight.accent
    );
    expect(container.style.getPropertyValue("--fhg-surface")).toBe(
      guardThemePresets.midnight.surface
    );
    dispose();
  });
});

describe("DirectionMatchPanel", () => {
  it("rotates with the buttons and reports direction + signals on confirm", () => {
    const onConfirm = vi.fn();
    render(<DirectionMatchPanel challenge={makeChallenge()} onConfirm={onConfirm} />);

    const cw = screen.getByRole("button", { name: /rotate clockwise/i });
    const ccw = screen.getByRole("button", { name: /rotate counter-clockwise/i });
    fireEvent.click(cw); // down -> down-left
    fireEvent.click(cw); // down-left -> left
    fireEvent.click(ccw); // left -> down-left (a direction change)
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [direction, meta] = onConfirm.mock.calls[0] as [string, { signals: Record<string, number>; clientDurationMs: number }];
    expect(direction).toBe("down-left");
    expect(meta.signals).toEqual({ rotateCount: 3, eventCount: 4, directionChangeCount: 1 });
    expect(meta.clientDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("supports arrow-key rotation and Enter to confirm, reporting keyboard input", () => {
    const onConfirm = vi.fn();
    render(<DirectionMatchPanel challenge={makeChallenge()} onConfirm={onConfirm} />);
    const confirmButton = screen.getByRole("button", { name: /confirm/i });

    // down -> rotate clockwise 4 steps -> up (matches target)
    for (let i = 0; i < 4; i += 1) {
      fireEvent.keyDown(confirmButton, { key: "ArrowRight" });
    }
    expect(screen.getByText(/matches the target/i)).toBeTruthy();

    fireEvent.keyDown(confirmButton, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [direction, meta] = onConfirm.mock.calls[0] as [string, { inputType: string; signals: Record<string, number> }];
    expect(direction).toBe("up");
    expect(meta.inputType).toBe("keyboard");
    expect(meta.signals.rotateCount).toBe(4);
    expect(meta.signals.directionChangeCount).toBe(0);
  });
});

describe("GuardOverlay", () => {
  it("renders an accessible modal dialog and cancels on Escape", () => {
    const onCancel = vi.fn();
    render(
      <GuardOverlay
        status="active"
        message=""
        challenge={makeChallenge()}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("moves initial focus into the dialog", () => {
    render(
      <GuardOverlay
        status="active"
        message=""
        challenge={makeChallenge()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

interface HarnessProps {
  controllerRef: { current: SubmitGuardController | null };
  onAppSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onToken?: (token: string) => void;
  onCancel?: () => void;
}

function HookHarness({ controllerRef, onAppSubmit, onToken, onCancel }: HarnessProps) {
  const controller = useSubmitGuard({ endpoint: "/guard", onToken, onCancel });
  controllerRef.current = controller;
  return (
    <form data-testid="form" onSubmit={onAppSubmit}>
      <input
        type="hidden"
        name="guardToken"
        value={controller.token ?? ""}
        readOnly
        ref={controller.inputRef}
      />
      <button type="submit">Go</button>
    </form>
  );
}

describe("useSubmitGuard flow", () => {
  function setup(challenges: PublicDirectionMatchChallenge[], verifyQueue: FetchResponse[]) {
    const fetchMock = mockFetch(challenges, verifyQueue);
    const controllerRef: { current: SubmitGuardController | null } = { current: null };
    const appSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const onToken = vi.fn();
    const onCancel = vi.fn();
    render(
      <HookHarness
        controllerRef={controllerRef}
        onAppSubmit={appSubmit}
        onToken={onToken}
        onCancel={onCancel}
      />
    );
    return { fetchMock, controllerRef, appSubmit, onToken, onCancel };
  }

  it("intercepts the real submit and fetches a challenge at submit time", async () => {
    const { fetchMock, controllerRef, appSubmit } = setup([makeChallenge()], []);
    const form = screen.getByTestId("form");

    // No challenge is fetched on mount — only at submit time.
    expect(fetchMock.calls).toHaveLength(0);

    fireEvent.submit(form);

    // The app's own submit handler must NOT run for the intercepted submit.
    expect(appSubmit).not.toHaveBeenCalled();
    expect(controllerRef.current?.open).toBe(true);

    await waitFor(() => expect(controllerRef.current?.status).toBe("active"));
    expect(controllerRef.current?.challenge?.challengeId).toBe("match-1");
    expect(fetchMock.calls[0]).toContain("/guard/challenge?mode=direction-match");
  });

  it("on success stores the token, closes, and resubmits with the token in form data", async () => {
    const { controllerRef, appSubmit, onToken } = setup(
      [makeChallenge()],
      [{ body: { ok: true, token: "tok_1" } }]
    );
    const form = screen.getByTestId("form");
    const tokenSeenByApp: unknown[] = [];
    appSubmit.mockImplementation((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      tokenSeenByApp.push(new FormData(event.currentTarget).get("guardToken"));
    });

    fireEvent.submit(form);
    await waitFor(() => expect(controllerRef.current?.status).toBe("active"));

    await act(async () => {
      controllerRef.current?.confirm("up", {
        inputType: "keyboard",
        signals: { rotateCount: 4, eventCount: 5, directionChangeCount: 0 },
        clientDurationMs: 1_500,
      });
    });

    await waitFor(() => expect(onToken).toHaveBeenCalledWith("tok_1"));
    expect(controllerRef.current?.open).toBe(false);
    expect(controllerRef.current?.token).toBe("tok_1");

    // The real submit continued exactly once, with the token in the form.
    expect(appSubmit).toHaveBeenCalledTimes(1);
    expect(tokenSeenByApp).toEqual(["tok_1"]);
  });

  it("on failure loads a fresh challenge and never lets the submit through", async () => {
    const { controllerRef, appSubmit } = setup(
      [makeChallenge(), makeChallenge({ challengeId: "match-2" })],
      [{ status: 400, body: { ok: false, code: "WRONG_DIRECTION" } }]
    );
    fireEvent.submit(screen.getByTestId("form"));
    await waitFor(() => expect(controllerRef.current?.status).toBe("active"));

    await act(async () => {
      controllerRef.current?.confirm("down", {
        inputType: "mouse",
        signals: { rotateCount: 0, eventCount: 1, directionChangeCount: 0 },
        clientDurationMs: 700,
      });
    });

    await waitFor(() => expect(controllerRef.current?.challenge?.challengeId).toBe("match-2"));
    expect(controllerRef.current?.open).toBe(true);
    expect(controllerRef.current?.message).toMatch(/fresh challenge/i);
    expect(controllerRef.current?.token).toBeNull();
    expect(appSubmit).not.toHaveBeenCalled();
  });

  it("cancel keeps the real submit cancelled", async () => {
    const { controllerRef, appSubmit, onCancel } = setup([makeChallenge()], []);
    fireEvent.submit(screen.getByTestId("form"));
    await waitFor(() => expect(controllerRef.current?.status).toBe("active"));

    act(() => controllerRef.current?.cancel());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(controllerRef.current?.open).toBe(false);
    expect(controllerRef.current?.token).toBeNull();
    expect(appSubmit).not.toHaveBeenCalled();
  });
});

describe("SubmitGuard component", () => {
  it("renders only a hidden input and opens a closed-ShadowRoot overlay on submit", async () => {
    mockFetch([makeChallenge()], []);
    const appSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    const { container, unmount } = render(
      <form onSubmit={appSubmit} data-testid="form">
        <input name="email" defaultValue="a@b.co" />
        <SubmitGuard theme="midnight" themeOverrides={{ accent: "#ff8800" }} />
        <button type="submit">Login</button>
      </form>
    );

    // Nothing visible before submit; no overlay host yet.
    expect(container.querySelector("[data-fhg-token-input]")).toBeTruthy();
    expect(document.querySelector("[data-fhg-overlay]")).toBeNull();

    fireEvent.submit(screen.getByTestId("form"));
    expect(appSubmit).not.toHaveBeenCalled();

    await waitFor(() => expect(document.querySelector("[data-fhg-overlay]")).toBeTruthy());
    const host = document.querySelector("[data-fhg-overlay]") as HTMLElement;
    // Closed by default: the page cannot reach inside the overlay.
    expect(host.shadowRoot).toBeNull();

    // Unmounting the guard tears the overlay down and restores the page.
    unmount();
    await waitFor(() => expect(document.querySelector("[data-fhg-overlay]")).toBeNull());
  });
});

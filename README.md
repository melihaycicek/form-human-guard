# form-human-guard

> A lightweight pre-submit direction matching guard for forms.

The user is shown a direction (an arrow) and has to perform it — by dragging with a mouse or finger, or by pressing arrow keys — before your form can be submitted. On success the server issues a short-lived, one-time, HMAC-signed guard token that your protected endpoint verifies and consumes.

Two guard styles are included:

- **`DirectionGuard`** — an always-visible widget inside the form (perform the shown direction).
- **`SubmitGuard`** (v0.2) — invisible until the user submits; the submit is intercepted and a randomized *direction-match* challenge (rotate your arrow until it matches the target) opens in a themeable overlay rendered inside a **closed ShadowRoot**. Verification adds server-side timing thresholds, lightweight interaction signals, and deterministic rule-based risk scoring.

## What it is — and what it is not

This package is not a full CAPTCHA replacement. The expected direction is visible to the client, so a targeted bot can always pass it. It is a lightweight pre-submit interaction guard designed to reduce low-effort automated form abuse. Use it together with rate limiting, server-side validation, and normal authentication security controls.

It is:

- ✅ A pre-submit human-interaction guard that filters out low-effort bots and accidental submits
- ✅ A short-lived, one-time token flow with server-side timing checks

It is **not**:

- ❌ An authentication system
- ❌ A CAPTCHA service
- ❌ A replacement for rate limiting

## Installation

```bash
npm install form-human-guard
```

Peer dependencies: `react` / `react-dom` (>= 18) for the component, `express` (>= 4) for the server adapter. All are optional — install only what you use.

## React usage

```tsx
import { useState } from "react";
import { DirectionGuard } from "form-human-guard/react";
import "form-human-guard/styles.css";

export function LoginForm() {
  const [guardToken, setGuardToken] = useState("");

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        guardToken,
      }),
    });
  }

  return (
    <form onSubmit={submitLogin}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <DirectionGuard onVerified={setGuardToken} />
      <button disabled={!guardToken}>Login</button>
    </form>
  );
}
```

The stylesheet is optional — the component is fully functional without it.

Other rendering options:

```tsx
// Unicode arrows instead of the SVG icon
<DirectionGuard iconType="symbol" />

// Bring your own icon
<DirectionGuard
  renderDirection={({ direction, size, rotation }) => (
    <MyDirectionIcon direction={direction} size={size} rotation={rotation} />
  )}
/>
```

## Submit-time guard (v0.2)

`SubmitGuard` renders nothing visible — just a hidden token input. When the user submits the form, the submit is intercepted, a direction-match challenge is created **at submit time**, and a modal overlay asks the user to rotate their arrow until it matches the randomized target. On success the one-time token lands in the hidden input and the original submit continues automatically; if the user cancels or verification fails, the submit stays cancelled.

```tsx
import { SubmitGuard } from "form-human-guard/react";

export function LoginForm() {
  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        guardToken: form.get("guardToken"), // filled in by SubmitGuard
      }),
    });
  }

  return (
    <form onSubmit={submitLogin}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <SubmitGuard theme="midnight" />
      <button>Login</button>
    </form>
  );
}
```

Notes:

- The overlay lives inside a **closed ShadowRoot** appended to `document.body`: host page CSS cannot restyle it, page scripts cannot reach into it (`host.shadowRoot` is `null`), and its styles cannot leak out. Closed is the default and only mode.
- Interaction works with pointer and keyboard (←/→ rotate, Enter confirms, Escape cancels). Focus moves into the dialog while open, is trapped there, and is restored on close. Status changes are announced via `aria-live`.
- Each submit attempt requires a fresh solve — tokens are one-time, and the guard re-intercepts the next submit.
- For a custom challenge UI, the headless `useSubmitGuard` hook exposes the same flow (`begin`/`confirm`/`cancel`, interception and resubmit included) without the overlay.

### Themes

The overlay is themed with a preset + override model:

```tsx
<SubmitGuard theme="glass" />
<SubmitGuard theme="terminal" themeOverrides={{ accent: "#f59e0b", radius: "0px" }} />
```

Presets: `minimal`, `light` (default), `midnight`, `glass`, `neutral`, `terminal`. Every token (accent, surface, backdrop, text, muted text, border, radius, spacing, control size, font family/size, surface blur) can be overridden, or pass a complete `GuardTheme` object instead of a preset name. `resolveGuardTheme` and `guardThemePresets` are exported for building your own.

## Express usage

```ts
import express from "express";
import { createGuardRoutes, requireGuardToken } from "form-human-guard/express";
import { MemoryStore } from "form-human-guard/stores";

const app = express();
app.use(express.json());

const store = new MemoryStore();
const secret = process.env.GUARD_SECRET!; // long random string, keep it out of the repo

app.use("/guard", createGuardRoutes({ store, secret, difficulty: "easy", action: "login" }));

app.post(
  "/login",
  requireGuardToken({ store, secret, tokenField: "guardToken", action: "login" }),
  async (req, res) => {
    // ...check credentials as usual...
    res.json({ ok: true });
  }
);

app.listen(3000);
```

Mounted at `/guard`, the router serves:

| Route | Purpose |
| --- | --- |
| `GET /guard/challenge?mode=direction` | Create a visible-widget challenge (default mode) |
| `GET /guard/challenge?mode=direction-match` | Create a submit-time direction-match challenge |
| `POST /guard/verify` | Verify the response for either mode; returns `{ ok: true, token }` |

Any other `mode` → 400 `UNSUPPORTED_MODE`. The same mounted router serves both guard styles — `SubmitGuard` needs no extra server setup.

### Risk scoring (direction-match only)

Direction-match verifications pass through a deterministic, rule-based risk layer after the hard checks (direction correctness, server-side min/max solve time, attempt limits). Rules score things like solving suspiciously close to the minimum duration, missing/malformed/inconsistent interaction signals, physically impossible rotation counts, repeated failures, and replay-like client-duration mismatches. The summed score maps to a decision:

- **allow** → token issued
- **challenge_again** (score ≥ 35) → 409 `CHALLENGE_AGAIN`, challenge invalidated, client fetches a fresh one
- **deny** (score ≥ 60) → 403 `RISK_DENIED`, challenge invalidated

Everything is configurable, and every decision is explainable through rule reasons — which stay on the server:

```ts
app.use("/guard", createGuardRoutes({
  store,
  secret,
  risk: {
    denyThreshold: 70,          // default 60
    challengeAgainThreshold: 40, // default 35
    // rules: [...]             // replace the default rule set
    // enabled: false           // turn the layer off
  },
  onRiskDecision: (assessment) => {
    // e.g. log { score, decision, reasons } — never sent to the client
    if (assessment.decision !== "allow") logger.warn(assessment);
  },
}));
```

There is no ML and no external service — the default rules live in `defaultDirectionMatchRiskRules` and are plain, testable functions.

### Interaction signals

The direction-match client reports only lightweight, non-sensitive counters: rotation steps, input events, rotation direction changes, plus the input method and a telemetry-only client duration. **No mouse coordinates, no fingerprinting.** Signals are untrusted: the server validates them (`validateDirectionMatchSignals`) and anomalies only ever raise the risk score. Timing decisions always come from server-measured elapsed time.

## How the flow works

1. `DirectionGuard` fetches a challenge and shows the direction to perform.
2. The user drags (mouse/touch) or uses arrow keys.
3. The component POSTs the performed direction to `/guard/verify`.
4. The server checks the direction and the interaction (timing is measured **server-side**), then issues a one-time guard token. `DirectionGuard` hands it to you via `onVerified`.
5. Your form submit includes the token; `requireGuardToken` verifies **and consumes** it — a token can never be used twice.

Defaults: challenges expire after 120 s, tokens after 180 s (both configurable). A challenge is deleted after 2 wrong-direction attempts.

## Security notes

- **Server-side timing.** The time between challenge creation and verification is computed on the server. The client-reported duration is telemetry only and never influences the decision.
- **One-time tokens.** Tokens are HMAC-SHA256 signed (constant-time compared), stored server-side, and deleted on first successful verification. Reuse always fails.
- **Action binding.** Pass `action` to both `createGuardRoutes` and `requireGuardToken` to scope tokens: a token issued for `"login"` is rejected on a `"comment"` endpoint with `ACTION_MISMATCH`.
- **Server-authoritative difficulty.** The client's `difficulty` prop is only a hint. The server uses its configured difficulty unless you explicitly opt in with `allowClientDifficulty: true`.
- **Attempt limits.** Wrong answers increment a counter; the challenge is deleted after 2 failures.
- **No secret leakage.** Error responses contain only a stable error code and a generic message.
- **Defence in depth.** Keep your rate limiting, input validation, and authentication controls — this guard complements them, it does not replace them.

## Stores: MemoryStore and RedisStore

`MemoryStore` (the default) keeps challenges and tokens in the Node process. That means:

- state is lost on restart, and
- it is **not suitable for multi-instance production deployments** (a challenge created on one instance cannot be verified on another).

It is intended for development and single-instance servers.

For production and multi-instance deployments, use the optional `RedisStore`. Redis is **not** a dependency of this package — you inject a connected client, so `MemoryStore` users install nothing extra:

```ts
import Redis from "ioredis";
import { RedisStore } from "form-human-guard/stores";

const store = new RedisStore({ client: new Redis(process.env.REDIS_URL!), keyPrefix: "fhg:" });
```

The injected client only needs `get`, `del`, and ioredis-style `set(key, value, "PX", ttlMs)`. For node-redis v4, wrap it:

```ts
import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
const store = new RedisStore({
  client: {
    get: (key) => client.get(key),
    set: (key, value, _px, ttlMs) => client.set(key, value, { PX: ttlMs }),
    del: (key) => client.del(key),
  },
});
```

Entries are stored as JSON with native Redis `PX` TTLs, so expiry and cleanup are handled by Redis, and one-time token consumption (`DEL` on first use) holds across instances. The store contract is covered by tests against an in-memory fake implementing the same client interface; for your deployment, run the same flow once against your real Redis as an integration check.

If you use different shared storage, implement the small `GuardStore` interface yourself:

```ts
import type { GuardStore } from "form-human-guard/stores";

interface GuardStore {
  setChallenge(id: string, value: StoredChallenge, ttlMs: number): Promise<void>;
  getChallenge(id: string): Promise<StoredChallenge | null>;
  deleteChallenge(id: string): Promise<void>;
  setToken(id: string, value: StoredToken, ttlMs: number): Promise<void>;
  getToken(id: string): Promise<StoredToken | null>;
  deleteToken(id: string): Promise<void>;
}
```

## API reference — `<DirectionGuard />`

```ts
import { DirectionGuard } from "form-human-guard/react";
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `endpoint` | `string` | `"/guard"` | Base path where the guard routes are mounted |
| `difficulty` | `"easy" \| "medium" \| "strict"` | `"easy"` | UI hint only; the server is authoritative |
| `iconType` | `"svg" \| "symbol"` | `"svg"` | Built-in SVG arrow or Unicode arrow characters |
| `size` | `"sm" \| "md" \| "lg" \| number` | `"md"` | Icon size (sm = 32, md = 48, lg = 64 px) |
| `disabled` | `boolean` | `false` | Disables all interaction |
| `className` | `string` | — | Extra class on the root element |
| `onVerified` | `(token: string) => void` | — | Called with the one-time guard token on success |
| `onError` | `(error: Error) => void` | — | Called on network/unexpected errors |
| `renderDirection` | `({ direction, size, rotation }) => ReactNode` | — | Custom direction renderer |

## API reference — `<SubmitGuard />`

```ts
import { SubmitGuard, useSubmitGuard } from "form-human-guard/react";
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `endpoint` | `string` | `"/guard"` | Base path where the guard routes are mounted |
| `difficulty` | `"easy" \| "medium" \| "strict"` | `"easy"` | UI hint only; the server is authoritative |
| `theme` | preset name or `GuardTheme` | `"light"` | Overlay theme |
| `themeOverrides` | `Partial<GuardTheme>` | — | Token overrides applied on top of the theme |
| `tokenFieldName` | `string` | `"guardToken"` | Name of the hidden input carrying the token |
| `disabled` | `boolean` | `false` | Stops intercepting submits |
| `onToken` | `(token: string) => void` | — | Called when a token is issued (also lands in the hidden input) |
| `onCancel` | `() => void` | — | Called when the user cancels; the submit stays cancelled |
| `onError` | `(error: Error) => void` | — | Called on network/unexpected errors |

`useSubmitGuard(options)` exposes the same flow headlessly: `{ open, status, message, challenge, token, inputRef, begin, confirm, cancel }`. Attach `inputRef` to a hidden input inside the form; interception and the post-success resubmit are handled for you.

### Input & accessibility

- **Pointer**: press, drag in the shown direction, release. The direction is derived from the angle of the start→end vector (eight 45° sectors).
- **Keyboard**: press the arrow keys. For diagonals, combine two arrows — hold them together or press them in quick succession (e.g. ↑ and → for up-right). The gesture commits shortly after all keys are released; Escape cancels.
- The expected direction is described in text (never color alone), the pad is keyboard-focusable, results are announced via `aria-live`, and the touch target is at least 44×44 px.
- Keyboard input is exempt from the pointer-distance check on the server.

## API reference — Express helpers

```ts
import { createGuardRoutes, requireGuardToken } from "form-human-guard/express";
```

### `createGuardRoutes(options)` → `Router`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `store` | `GuardStore` | required | Challenge/token persistence |
| `secret` | `string` | required | HMAC signing secret |
| `difficulty` | `Difficulty` | `"easy"` | Server-side difficulty |
| `allowClientDifficulty` | `boolean` | `false` | Honour a valid `?difficulty` query param |
| `action` | `string` | — | Bind issued tokens to this action |
| `challengeTtlMs` | `number` | `120000` | Challenge lifetime |
| `tokenTtlMs` | `number` | `180000` | Token lifetime |
| `risk` | `RiskConfig` | defaults | Risk scoring for direction-match (thresholds, rules, enabled) |
| `onRiskDecision` | `(assessment) => void` | — | Server-side observability hook for risk assessments |

Routes are relative to the mount point — mount with `app.use("/guard", ...)`.

### `requireGuardToken(options)` → middleware

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `store` | `GuardStore` | required | Same store used by the routes |
| `secret` | `string` | required | Same secret used by the routes |
| `tokenField` | `string` | `"guardToken"` | JSON body field holding the token |
| `action` | `string` | — | Required token action |

Requires `express.json()` upstream. On success the decoded payload is attached as `req.guardToken` and the token is consumed.

### Server utilities

```ts
import {
  createDirectionChallenge,
  createDirectionMatchChallenge,
  verifyDirectionChallenge,
  verifyDirectionMatchChallenge,
  verifyGuardResponse, // mode-dispatching: routes by the stored challenge's mode
  issueGuardToken,
  verifyGuardToken,
  assessDirectionMatchRisk,
  validateDirectionMatchSignals,
  defaultDirectionMatchRiskRules,
} from "form-human-guard/server";
```

Framework-agnostic building blocks used by the Express adapter — use these to wire the same flow into any Node server.

### Error codes

Verification failures respond with `{ ok: false, code, message }` and an appropriate 4xx status:

| Code | Status |
| --- | --- |
| `INVALID_REQUEST`, `UNSUPPORTED_MODE`, `WRONG_DIRECTION`, `TOO_FAST`, `TOO_SLOW`, `MOVEMENT_TOO_SHORT` | 400 |
| `TOKEN_INVALID`, `TOKEN_NOT_FOUND`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED` | 401 |
| `ACTION_MISMATCH`, `RISK_DENIED` | 403 |
| `CHALLENGE_NOT_FOUND` | 404 |
| `CHALLENGE_AGAIN` | 409 |
| `CHALLENGE_EXPIRED` | 410 |

## License

MIT

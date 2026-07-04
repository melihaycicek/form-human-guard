# form-human-guard

> A lightweight pre-submit direction matching guard for forms.

The user is shown a direction (an arrow) and has to perform it — by dragging with a mouse or finger, or by pressing arrow keys — before your form can be submitted. On success the server issues a short-lived, one-time, HMAC-signed guard token that your protected endpoint verifies and consumes.

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
| `GET /guard/challenge?mode=direction` | Create a challenge (any other `mode` → 400 `UNSUPPORTED_MODE`) |
| `POST /guard/verify` | Verify the performed direction; returns `{ ok: true, token }` |

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

## MemoryStore warning

`MemoryStore` keeps challenges and tokens in the Node process. That means:

- state is lost on restart, and
- it is **not suitable for multi-instance production deployments** (a challenge created on one instance cannot be verified on another).

It is intended for development and single-instance servers. For anything else, implement the small `GuardStore` interface against your shared storage:

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
  verifyDirectionChallenge,
  issueGuardToken,
  verifyGuardToken,
} from "form-human-guard/server";
```

Framework-agnostic building blocks used by the Express adapter — use these to wire the same flow into any Node server.

### Error codes

Verification failures respond with `{ ok: false, code, message }` and an appropriate 4xx status:

| Code | Status |
| --- | --- |
| `INVALID_REQUEST`, `UNSUPPORTED_MODE`, `WRONG_DIRECTION`, `TOO_FAST`, `TOO_SLOW`, `MOVEMENT_TOO_SHORT` | 400 |
| `TOKEN_INVALID`, `TOKEN_NOT_FOUND`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED` | 401 |
| `ACTION_MISMATCH` | 403 |
| `CHALLENGE_NOT_FOUND` | 404 |
| `CHALLENGE_EXPIRED` | 410 |

## License

MIT

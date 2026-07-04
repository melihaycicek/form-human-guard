import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueGuardToken } from "../src/server/issueToken";
import { verifyGuardToken } from "../src/server/verifyToken";
import { MemoryStore } from "../src/stores/MemoryStore";

const SECRET = "test-secret";

function flipLastChar(value: string): string {
  const last = value.slice(-1);
  return value.slice(0, -1) + (last === "A" ? "B" : "A");
}

describe("guard tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function issue(action?: string) {
    const store = new MemoryStore();
    const issued = await issueGuardToken({
      store,
      secret: SECRET,
      challengeId: "challenge-1",
      action,
    });
    return { store, ...issued };
  }

  it("issues a token that verifies and returns its payload", async () => {
    const now = Date.now();
    const { store, token, payload } = await issue("login");

    expect(payload.jti.length).toBeGreaterThanOrEqual(16);
    expect(payload.challengeId).toBe("challenge-1");
    expect(payload.mode).toBe("direction");
    expect(payload.action).toBe("login");
    expect(payload.issuedAt).toBe(now);
    expect(payload.expiresAt).toBe(now + 180_000);

    const result = await verifyGuardToken({ store, secret: SECRET, token, action: "login" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.jti).toBe(payload.jti);
    }
  });

  it("consumes the token on first use so a second use always fails", async () => {
    const { store, token } = await issue();

    const first = await verifyGuardToken({ store, secret: SECRET, token });
    expect(first.ok).toBe(true);

    const second = await verifyGuardToken({ store, secret: SECRET, token });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(["TOKEN_INVALID", "TOKEN_NOT_FOUND", "TOKEN_ALREADY_USED"]).toContain(second.code);
    }
  });

  it("rejects a tampered signature without throwing", async () => {
    const { store, token } = await issue();
    const tampered = flipLastChar(token);

    const result = await verifyGuardToken({ store, secret: SECRET, token: tampered });
    expect(result).toEqual({ ok: false, code: "TOKEN_INVALID" });

    // The genuine token must still be intact and usable.
    const genuine = await verifyGuardToken({ store, secret: SECRET, token });
    expect(genuine.ok).toBe(true);
  });

  it("rejects a length-mismatched signature without throwing", async () => {
    const { store, token } = await issue();

    const longer = await verifyGuardToken({ store, secret: SECRET, token: `${token}AAAA` });
    expect(longer).toEqual({ ok: false, code: "TOKEN_INVALID" });

    const shorter = await verifyGuardToken({ store, secret: SECRET, token: token.slice(0, -6) });
    expect(shorter).toEqual({ ok: false, code: "TOKEN_INVALID" });
  });

  it("rejects a tampered payload even when the shape stays valid", async () => {
    const { store, token, payload } = await issue("login");
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...payload, action: "admin" }),
      "utf8"
    ).toString("base64url");

    const result = await verifyGuardToken({
      store,
      secret: SECRET,
      token: `${forgedPayload}.${signature}`,
      action: "admin",
    });
    expect(result).toEqual({ ok: false, code: "TOKEN_INVALID" });
  });

  it("rejects malformed token strings without throwing", async () => {
    const store = new MemoryStore();
    for (const bad of ["", ".", "abc", "abc.", ".abc", "not-base64.not-a-sig"]) {
      const result = await verifyGuardToken({ store, secret: SECRET, token: bad });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects an expired token", async () => {
    const { store, token } = await issue();
    vi.advanceTimersByTime(180_001);

    const result = await verifyGuardToken({ store, secret: SECRET, token });
    expect(result).toEqual({ ok: false, code: "TOKEN_EXPIRED" });
  });

  it("rejects an action mismatch in both directions", async () => {
    const { store, token } = await issue("login");
    const mismatch = await verifyGuardToken({ store, secret: SECRET, token, action: "comment" });
    expect(mismatch).toEqual({ ok: false, code: "ACTION_MISMATCH" });

    const { store: store2, token: token2 } = await issue();
    const required = await verifyGuardToken({
      store: store2,
      secret: SECRET,
      token: token2,
      action: "login",
    });
    expect(required).toEqual({ ok: false, code: "ACTION_MISMATCH" });
  });

  it("does not consume the token on an action mismatch", async () => {
    const { store, token } = await issue("login");
    await verifyGuardToken({ store, secret: SECRET, token, action: "comment" });

    const correct = await verifyGuardToken({ store, secret: SECRET, token, action: "login" });
    expect(correct.ok).toBe(true);
  });
});

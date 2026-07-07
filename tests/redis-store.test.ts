import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredChallenge } from "../src/core/types";
import { createDirectionMatchChallenge } from "../src/server/createChallenge";
import { verifyDirectionMatchChallenge } from "../src/server/verifyDirectionMatch";
import { verifyGuardToken } from "../src/server/verifyToken";
import { ringDistance } from "../src/modes/direction-match/directionMatch.utils";
import { RedisStore } from "../src/stores/RedisStore";
import type { RedisStoreClient } from "../src/stores/RedisStore";

/**
 * In-memory fake implementing the injected client contract (ioredis-style
 * `set(key, value, "PX", ttl)`), including PX expiry, so the RedisStore's
 * behavior against the contract is tested without a Redis server.
 * Integration against a real Redis is documented in the README.
 */
class FakeRedisClient implements RedisStoreClient {
  readonly data = new Map<string, { value: string; expiresAt: number }>();
  calls: string[] = [];

  async get(key: string): Promise<string | null> {
    this.calls.push(`get:${key}`);
    const entry = this.data.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, pxKeyword: "PX", ttlMs: number): Promise<unknown> {
    this.calls.push(`set:${key}:${pxKeyword}:${ttlMs}`);
    if (pxKeyword !== "PX") {
      throw new Error("expected PX expiry mode");
    }
    this.data.set(key, { value, expiresAt: Date.now() + ttlMs });
    return "OK";
  }

  async del(key: string): Promise<unknown> {
    this.calls.push(`del:${key}`);
    return this.data.delete(key) ? 1 : 0;
  }
}

function makeChallenge(): StoredChallenge {
  return {
    expectedDirection: "up",
    initialDirection: "down",
    createdAt: Date.now(),
    expiresAt: Date.now() + 120_000,
    attemptCount: 0,
    difficulty: "easy",
    mode: "direction-match",
  };
}

describe("RedisStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a client", () => {
    expect(() => new RedisStore({} as never)).toThrow(/client/);
  });

  it("round-trips challenges and tokens as JSON under prefixed keys", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    const challenge = makeChallenge();

    await store.setChallenge("c1", challenge, 10_000);
    expect(client.data.has("fhg:challenge:c1")).toBe(true);
    expect(await store.getChallenge("c1")).toEqual(challenge);

    const token = {
      jti: "t1",
      challengeId: "c1",
      mode: "direction-match" as const,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 180_000,
    };
    await store.setToken("t1", token, 10_000);
    expect(client.data.has("fhg:token:t1")).toBe(true);
    expect(await store.getToken("t1")).toEqual(token);
  });

  it("honours a custom key prefix and keeps namespaces separate", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client, keyPrefix: "myapp:" });
    await store.setChallenge("same", makeChallenge(), 10_000);
    expect(client.data.has("myapp:challenge:same")).toBe(true);
    expect(await store.getToken("same")).toBeNull();
  });

  it("uses PX TTLs so Redis expires entries", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    await store.setChallenge("c1", makeChallenge(), 5_000);
    expect(client.calls).toContain("set:fhg:challenge:c1:PX:5000");

    vi.advanceTimersByTime(5_001);
    expect(await store.getChallenge("c1")).toBeNull();
  });

  it("deletes entries (consume semantics)", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    await store.setChallenge("c1", makeChallenge(), 10_000);
    await store.deleteChallenge("c1");
    expect(await store.getChallenge("c1")).toBeNull();
  });

  it("treats corrupted records as absent and clears them", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    client.data.set("fhg:challenge:bad", { value: "{not json", expiresAt: Date.now() + 10_000 });
    expect(await store.getChallenge("bad")).toBeNull();
    expect(client.data.has("fhg:challenge:bad")).toBe(false);
  });

  it("supports the full direction-match + one-time-token flow end to end", async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    const secret = "redis-secret";

    const challenge = await createDirectionMatchChallenge({ store, difficulty: "easy" });
    vi.advanceTimersByTime(2_000);

    const steps = ringDistance(challenge.initialDirection, challenge.targetDirection);
    const result = await verifyDirectionMatchChallenge({
      store,
      secret,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: { rotateCount: steps, eventCount: steps + 1, directionChangeCount: 0 },
      },
      action: "login",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Challenge consumed in Redis.
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();

    // One-time token: first use passes, reuse fails across the shared store.
    const first = await verifyGuardToken({ store, secret, token: result.token, action: "login" });
    expect(first.ok).toBe(true);
    const second = await verifyGuardToken({ store, secret, token: result.token, action: "login" });
    expect(second).toEqual({ ok: false, code: "TOKEN_NOT_FOUND" });
  });
});

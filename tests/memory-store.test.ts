import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredChallenge, StoredToken } from "../src/core/types";
import { MemoryStore } from "../src/stores/MemoryStore";

function makeChallenge(overrides: Partial<StoredChallenge> = {}): StoredChallenge {
  return {
    expectedDirection: "up",
    createdAt: Date.now(),
    expiresAt: Date.now() + 120_000,
    attemptCount: 0,
    difficulty: "easy",
    mode: "direction",
    ...overrides,
  };
}

function makeToken(overrides: Partial<StoredToken> = {}): StoredToken {
  return {
    jti: "jti-1",
    challengeId: "challenge-1",
    mode: "direction",
    issuedAt: Date.now(),
    expiresAt: Date.now() + 180_000,
    ...overrides,
  };
}

describe("MemoryStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores, returns and deletes challenges", async () => {
    const store = new MemoryStore();
    const challenge = makeChallenge();

    await store.setChallenge("a", challenge, 10_000);
    expect(await store.getChallenge("a")).toEqual(challenge);

    await store.deleteChallenge("a");
    expect(await store.getChallenge("a")).toBeNull();
  });

  it("stores, returns and deletes tokens", async () => {
    const store = new MemoryStore();
    const token = makeToken();

    await store.setToken("t", token, 10_000);
    expect(await store.getToken("t")).toEqual(token);

    await store.deleteToken("t");
    expect(await store.getToken("t")).toBeNull();
  });

  it("expires entries after their TTL", async () => {
    const store = new MemoryStore();
    await store.setChallenge("a", makeChallenge(), 10_000);
    await store.setToken("t", makeToken(), 5_000);

    vi.advanceTimersByTime(5_001);
    expect(await store.getToken("t")).toBeNull();
    expect(await store.getChallenge("a")).not.toBeNull();

    vi.advanceTimersByTime(5_000);
    expect(await store.getChallenge("a")).toBeNull();
  });

  it("keeps challenge and token namespaces independent", async () => {
    const store = new MemoryStore();
    await store.setChallenge("same-id", makeChallenge(), 10_000);
    await store.setToken("same-id", makeToken(), 10_000);

    await store.deleteChallenge("same-id");
    expect(await store.getChallenge("same-id")).toBeNull();
    expect(await store.getToken("same-id")).not.toBeNull();
  });

  it("overwrites an existing entry with a fresh TTL", async () => {
    const store = new MemoryStore();
    await store.setChallenge("a", makeChallenge(), 1_000);
    vi.advanceTimersByTime(900);
    await store.setChallenge("a", makeChallenge({ attemptCount: 1 }), 1_000);
    vi.advanceTimersByTime(500);

    const entry = await store.getChallenge("a");
    expect(entry?.attemptCount).toBe(1);
  });
});

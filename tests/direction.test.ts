import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Direction } from "../src/core/types";
import { DIRECTIONS } from "../src/modes/direction/direction.constants";
import { angleToDirection, directionFromDelta } from "../src/modes/direction/direction.utils";
import { createDirectionChallenge } from "../src/server/createChallenge";
import { verifyDirectionChallenge } from "../src/server/verifyChallenge";
import { verifyGuardToken } from "../src/server/verifyToken";
import { MemoryStore } from "../src/stores/MemoryStore";

const SECRET = "test-secret";

function otherDirection(direction: Direction): Direction {
  const other = DIRECTIONS.find((d) => d !== direction);
  if (!other) throw new Error("unreachable");
  return other;
}

describe("angleToDirection", () => {
  it("maps all 8 sector centres", () => {
    expect(angleToDirection(0)).toBe("right");
    expect(angleToDirection(45)).toBe("up-right");
    expect(angleToDirection(90)).toBe("up");
    expect(angleToDirection(135)).toBe("up-left");
    expect(angleToDirection(180)).toBe("left");
    expect(angleToDirection(225)).toBe("down-left");
    expect(angleToDirection(270)).toBe("down");
    expect(angleToDirection(315)).toBe("down-right");
  });

  it("assigns boundary angles to the counter-clockwise neighbour", () => {
    expect(angleToDirection(22.5)).toBe("up-right");
    expect(angleToDirection(67.5)).toBe("up");
    expect(angleToDirection(112.5)).toBe("up-left");
    expect(angleToDirection(157.5)).toBe("left");
    expect(angleToDirection(202.5)).toBe("down-left");
    expect(angleToDirection(247.5)).toBe("down");
    expect(angleToDirection(292.5)).toBe("down-right");
    expect(angleToDirection(337.5)).toBe("right");
  });

  it("normalizes negative angles and full turns", () => {
    expect(angleToDirection(-45)).toBe("down-right");
    expect(angleToDirection(-90)).toBe("down");
    expect(angleToDirection(360)).toBe("right");
    expect(angleToDirection(450)).toBe("up");
  });
});

describe("directionFromDelta (screen coordinates, y grows downward)", () => {
  it("maps deltas to all 8 directions", () => {
    expect(directionFromDelta(0, -10)).toBe("up");
    expect(directionFromDelta(10, 0)).toBe("right");
    expect(directionFromDelta(0, 10)).toBe("down");
    expect(directionFromDelta(-10, 0)).toBe("left");
    expect(directionFromDelta(10, -10)).toBe("up-right");
    expect(directionFromDelta(-10, -10)).toBe("up-left");
    expect(directionFromDelta(10, 10)).toBe("down-right");
    expect(directionFromDelta(-10, 10)).toBe("down-left");
  });

  it("uses angle sectors, not naive sign comparison", () => {
    // 5px right, 40px up: nearly vertical, must be "up" even though dx > 0.
    expect(directionFromDelta(5, -40)).toBe("up");
    // 40px right, 5px down: nearly horizontal, must be "right".
    expect(directionFromDelta(40, 5)).toBe("right");
  });
});

describe("challenge creation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a stored challenge matching the public challenge", async () => {
    const store = new MemoryStore();
    const now = Date.now();
    const publicChallenge = await createDirectionChallenge({ store, difficulty: "medium" });

    expect(publicChallenge.mode).toBe("direction");
    expect(publicChallenge.difficulty).toBe("medium");
    expect(DIRECTIONS).toContain(publicChallenge.direction);
    expect(publicChallenge.expiresAt).toBe(now + 120_000);
    expect(publicChallenge.challengeId.length).toBeGreaterThanOrEqual(16);

    const stored = await store.getChallenge(publicChallenge.challengeId);
    expect(stored).not.toBeNull();
    expect(stored?.expectedDirection).toBe(publicChallenge.direction);
    expect(stored?.attemptCount).toBe(0);
    expect(stored?.difficulty).toBe("medium");
    expect(stored?.createdAt).toBe(now);
  });

  it("generates unique crypto-random ids", async () => {
    const store = new MemoryStore();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const challenge = await createDirectionChallenge({ store });
      ids.add(challenge.challengeId);
    }
    expect(ids.size).toBe(50);
  });

  it("respects a custom challenge TTL", async () => {
    const store = new MemoryStore();
    const now = Date.now();
    const challenge = await createDirectionChallenge({ store, challengeTtlMs: 5_000 });
    expect(challenge.expiresAt).toBe(now + 5_000);
  });
});

describe("verifyDirectionChallenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(difficulty: Difficulty = "easy") {
    const store = new MemoryStore();
    const challenge = await createDirectionChallenge({ store, difficulty });
    return { store, challenge };
  }

  it("issues a one-time token for a correct response", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(500);

    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
      },
      action: "login",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.challengeId).toBe(challenge.challengeId);
    expect(result.payload.action).toBe("login");

    // Challenge is consumed on success.
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();

    // The issued token verifies (and is itself consumed).
    const tokenResult = await verifyGuardToken({
      store,
      secret: SECRET,
      token: result.token,
      action: "login",
    });
    expect(tokenResult.ok).toBe(true);
  });

  it("rejects a wrong direction, increments attemptCount, deletes after 2 failures", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(500);
    const wrong = otherDirection(challenge.direction);
    const response = {
      challengeId: challenge.challengeId,
      direction: wrong,
      inputType: "mouse" as const,
      pointerDistance: 120,
    };

    const first = await verifyDirectionChallenge({ store, secret: SECRET, response });
    expect(first).toEqual({ ok: false, code: "WRONG_DIRECTION" });
    expect((await store.getChallenge(challenge.challengeId))?.attemptCount).toBe(1);

    const second = await verifyDirectionChallenge({ store, secret: SECRET, response });
    expect(second).toEqual({ ok: false, code: "WRONG_DIRECTION" });
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();

    // Third attempt cannot retry the same challenge, even with the right answer.
    const third = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: { ...response, direction: challenge.direction },
    });
    expect(third).toEqual({ ok: false, code: "CHALLENGE_NOT_FOUND" });
  });

  it("rejects an expired challenge", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(121_000);

    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
      },
    });
    expect(result).toEqual({ ok: false, code: "CHALLENGE_EXPIRED" });
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();
  });

  it("rejects TOO_FAST using server-side timing even when clientDurationMs looks human", async () => {
    const { store, challenge } = await setup();
    // No time has passed on the server clock; the client claims 5 seconds.
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
        clientDurationMs: 5_000,
      },
    });
    expect(result).toEqual({ ok: false, code: "TOO_FAST" });
  });

  it("ignores a tiny clientDurationMs when server-side timing is fine", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(500);
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
        clientDurationMs: 1,
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects TOO_SLOW when the max duration is exceeded", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(11_000); // easy maxDurationMs is 10s; TTL is 120s.
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
      },
    });
    expect(result).toEqual({ ok: false, code: "TOO_SLOW" });
  });

  it("lets keyboard input pass without pointerDistance", async () => {
    const { store, challenge } = await setup("strict");
    vi.advanceTimersByTime(500);
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "keyboard",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects pointer input with movement below the minimum distance", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(500);
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 5, // easy minPointerDistance is 20.
      },
    });
    expect(result).toEqual({ ok: false, code: "MOVEMENT_TOO_SHORT" });
  });

  it("rejects an unknown challenge id", async () => {
    const store = new MemoryStore();
    const result = await verifyDirectionChallenge({
      store,
      secret: SECRET,
      response: { challengeId: "nope", direction: "up", inputType: "mouse", pointerDistance: 50 },
    });
    expect(result).toEqual({ ok: false, code: "CHALLENGE_NOT_FOUND" });
  });
});

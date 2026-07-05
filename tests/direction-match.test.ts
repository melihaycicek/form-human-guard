import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Direction } from "../src/core/types";
import { DIRECTIONS } from "../src/modes/direction/direction.constants";
import {
  createDirectionMatchChallengeData,
  randomDirectionPair,
} from "../src/modes/direction-match/directionMatch.create";
import {
  DIRECTION_RING,
  ringDistance,
  rotateDirection,
} from "../src/modes/direction-match/directionMatch.utils";
import { createDirectionMatchChallenge } from "../src/server/createChallenge";
import { verifyDirectionMatchChallenge } from "../src/server/verifyDirectionMatch";
import { verifyGuardResponse } from "../src/server/verifyResponse";
import { verifyGuardToken } from "../src/server/verifyToken";
import { MemoryStore } from "../src/stores/MemoryStore";

const SECRET = "test-secret";

/** Signals a plausible honest client would send for a given challenge. */
function honestSignals(initial: Direction, target: Direction) {
  const steps = ringDistance(initial, target);
  return { rotateCount: steps, eventCount: steps + 1, directionChangeCount: 0 };
}

describe("rotateDirection / ringDistance", () => {
  it("rotates clockwise and counter-clockwise around the ring", () => {
    expect(rotateDirection("up", 1)).toBe("up-right");
    expect(rotateDirection("up", -1)).toBe("up-left");
    expect(rotateDirection("up-left", 1)).toBe("up");
    expect(rotateDirection("up", 8)).toBe("up");
    // -9 is a full turn plus one counter-clockwise step.
    expect(rotateDirection("down", -9)).toBe("down-right");
  });

  it("measures the minimal step distance", () => {
    expect(ringDistance("up", "up")).toBe(0);
    expect(ringDistance("up", "up-right")).toBe(1);
    expect(ringDistance("up", "down")).toBe(4);
    expect(ringDistance("up", "up-left")).toBe(1);
    expect(ringDistance("right", "left")).toBe(4);
  });
});

describe("randomDirectionPair", () => {
  it("never returns an equal target and initial direction", () => {
    for (let i = 0; i < 500; i += 1) {
      const { targetDirection, initialDirection } = randomDirectionPair();
      expect(DIRECTIONS).toContain(targetDirection);
      expect(DIRECTIONS).toContain(initialDirection);
      expect(initialDirection).not.toBe(targetDirection);
    }
  });

  it("covers all 8 target directions and all 7 offsets", () => {
    const targets = new Set<Direction>();
    const offsets = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const pair = randomDirectionPair();
      targets.add(pair.targetDirection);
      offsets.add(ringDistance(pair.targetDirection, pair.initialDirection));
    }
    expect(targets.size).toBe(8);
    // ringDistance folds offsets 5..7 onto 3..1, so distances are 1..4.
    expect([...offsets].sort()).toEqual([1, 2, 3, 4]);
  });

  it("is deterministic with an injected random function", () => {
    const sequence = [2, 0]; // target = ring[2] = "right", offset = 1 + 0
    const randomIntFn = () => sequence.shift() ?? 0;
    const pair = randomDirectionPair(randomIntFn);
    expect(pair.targetDirection).toBe("right");
    expect(pair.initialDirection).toBe(rotateDirection("right", 1));
    expect(pair.initialDirection).toBe(DIRECTION_RING[3]);
  });
});

describe("direction-match challenge creation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a stored challenge matching the public challenge", async () => {
    const store = new MemoryStore();
    const now = Date.now();
    const publicChallenge = await createDirectionMatchChallenge({ store, difficulty: "medium" });

    expect(publicChallenge.mode).toBe("direction-match");
    expect(publicChallenge.targetDirection).not.toBe(publicChallenge.initialDirection);
    expect(publicChallenge.expiresAt).toBe(now + 120_000);

    const stored = await store.getChallenge(publicChallenge.challengeId);
    expect(stored?.mode).toBe("direction-match");
    expect(stored?.expectedDirection).toBe(publicChallenge.targetDirection);
    expect(stored?.initialDirection).toBe(publicChallenge.initialDirection);
    expect(stored?.attemptCount).toBe(0);
  });

  it("randomizes target and initial in the pure data factory too", () => {
    const data = createDirectionMatchChallengeData({ difficulty: "easy" });
    expect(data.stored.expectedDirection).toBe(data.publicChallenge.targetDirection);
    expect(data.publicChallenge.initialDirection).not.toBe(data.publicChallenge.targetDirection);
  });
});

describe("verifyDirectionMatchChallenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(difficulty: Difficulty = "easy") {
    const store = new MemoryStore();
    const challenge = await createDirectionMatchChallenge({ store, difficulty });
    return { store, challenge };
  }

  it("issues a one-time token for the correct final direction", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(2_000);

    const result = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
        clientDurationMs: 1_900,
      },
      action: "login",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.mode).toBe("direction-match");
    expect(result.payload.action).toBe("login");
    expect(result.risk.decision).toBe("allow");
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();

    const first = await verifyGuardToken({
      store,
      secret: SECRET,
      token: result.token,
      action: "login",
    });
    expect(first.ok).toBe(true);
    const second = await verifyGuardToken({
      store,
      secret: SECRET,
      token: result.token,
      action: "login",
    });
    expect(second.ok).toBe(false);
  });

  it("rejects a wrong final direction and enforces the attempt limit", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(2_000);
    const wrong = rotateDirection(challenge.targetDirection, 1);
    const response = {
      challengeId: challenge.challengeId,
      direction: wrong,
      inputType: "mouse" as const,
      signals: honestSignals(challenge.initialDirection, wrong),
    };

    const first = await verifyDirectionMatchChallenge({ store, secret: SECRET, response });
    expect(first).toEqual({ ok: false, code: "WRONG_DIRECTION" });
    expect((await store.getChallenge(challenge.challengeId))?.attemptCount).toBe(1);

    const second = await verifyDirectionMatchChallenge({ store, secret: SECRET, response });
    expect(second).toEqual({ ok: false, code: "WRONG_DIRECTION" });
    expect(await store.getChallenge(challenge.challengeId)).toBeNull();

    const third = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: { ...response, direction: challenge.targetDirection },
    });
    expect(third).toEqual({ ok: false, code: "CHALLENGE_NOT_FOUND" });
  });

  it("rejects an expired challenge", async () => {
    const { store, challenge } = await setup();
    vi.advanceTimersByTime(121_000);
    const result = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
      },
    });
    expect(result).toEqual({ ok: false, code: "CHALLENGE_EXPIRED" });
  });

  it("rejects too-fast solves via server-side timing regardless of clientDurationMs", async () => {
    const { store, challenge } = await setup(); // easy: min 400ms
    vi.advanceTimersByTime(100);
    const result = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
        clientDurationMs: 5_000, // claims to be slow; server knows better
      },
    });
    expect(result).toEqual({ ok: false, code: "TOO_FAST" });
  });

  it("rejects too-late solves within the challenge TTL", async () => {
    const { store, challenge } = await setup(); // easy: max 20s, TTL 120s
    vi.advanceTimersByTime(21_000);
    const result = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
      },
    });
    expect(result).toEqual({ ok: false, code: "TOO_SLOW" });
  });

  it("applies stricter timing per difficulty", async () => {
    const { store, challenge } = await setup("strict"); // min 800ms
    vi.advanceTimersByTime(600);
    const result = await verifyDirectionMatchChallenge({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "keyboard",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
      },
    });
    expect(result).toEqual({ ok: false, code: "TOO_FAST" });
  });
});

describe("verifyGuardResponse dispatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("routes direction-match challenges to the match verifier", async () => {
    const store = new MemoryStore();
    const challenge = await createDirectionMatchChallenge({ store });
    vi.advanceTimersByTime(2_000);

    const result = await verifyGuardResponse({
      store,
      secret: SECRET,
      response: {
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "touch",
        signals: honestSignals(challenge.initialDirection, challenge.targetDirection),
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.mode).toBe("direction-match");
    }
  });

  it("returns CHALLENGE_NOT_FOUND for unknown ids", async () => {
    const store = new MemoryStore();
    const result = await verifyGuardResponse({
      store,
      secret: SECRET,
      response: { challengeId: "nope", direction: "up", inputType: "mouse" },
    });
    expect(result).toEqual({ ok: false, code: "CHALLENGE_NOT_FOUND" });
  });
});

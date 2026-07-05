import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Direction } from "../src/core/types";
import { createGuardRoutes, requireGuardToken } from "../src/express";
import { DIRECTIONS } from "../src/modes/direction/direction.constants";
import { ringDistance, rotateDirection } from "../src/modes/direction-match/directionMatch.utils";
import type { RiskAssessment } from "../src/server/risk/types";
import { MemoryStore } from "../src/stores";

const SECRET = "integration-secret";

function otherDirection(direction: Direction): Direction {
  const other = DIRECTIONS.find((d) => d !== direction);
  if (!other) throw new Error("unreachable");
  return other;
}

function buildApp() {
  const app = express();
  app.use(express.json());

  const store = new MemoryStore();
  app.use("/guard", createGuardRoutes({ store, secret: SECRET, difficulty: "easy", action: "login" }));

  app.post("/login", requireGuardToken({ store, secret: SECRET, action: "login" }), (_req, res) => {
    res.json({ ok: true });
  });
  app.post(
    "/comment",
    requireGuardToken({ store, secret: SECRET, action: "comment" }),
    (_req, res) => {
      res.json({ ok: true });
    }
  );

  return app;
}

type App = ReturnType<typeof buildApp>;

async function getChallenge(app: App) {
  const res = await request(app).get("/guard/challenge?mode=direction").expect(200);
  return res.body as { challengeId: string; direction: Direction; mode: string; expiresAt: number };
}

async function solveChallenge(app: App): Promise<string> {
  const challenge = await getChallenge(app);
  vi.setSystemTime(Date.now() + 500);
  const res = await request(app)
    .post("/guard/verify")
    .send({
      challengeId: challenge.challengeId,
      direction: challenge.direction,
      inputType: "mouse",
      pointerDistance: 120,
      clientDurationMs: 480,
    })
    .expect(200);
  expect(res.body.ok).toBe(true);
  return res.body.token as string;
}

describe("express adapter", () => {
  beforeEach(() => {
    // Fake only Date so server-side timing is controllable while supertest's
    // real sockets and timers keep working.
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves routes relative to the mount point", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);
    expect(challenge.mode).toBe("direction");
    expect(DIRECTIONS).toContain(challenge.direction);

    // No double-prefixed route.
    await request(app).get("/guard/guard/challenge").expect(404);
  });

  it("completes the full happy path: challenge -> verify -> protected route", async () => {
    const app = buildApp();
    const token = await solveChallenge(app);

    const res = await request(app)
      .post("/login")
      .send({ email: "a@b.co", password: "pw", guardToken: token })
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects a wrong direction with 400 WRONG_DIRECTION", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);
    vi.setSystemTime(Date.now() + 500);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: otherDirection(challenge.direction),
        inputType: "mouse",
        pointerDistance: 120,
      })
      .expect(400);
    expect(res.body.code).toBe("WRONG_DIRECTION");
  });

  it("rejects an expired challenge with 410 CHALLENGE_EXPIRED", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);
    vi.setSystemTime(Date.now() + 121_000);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
      })
      .expect(410);
    expect(res.body.code).toBe("CHALLENGE_EXPIRED");
  });

  it("rejects a response that is too fast with 400 TOO_FAST", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "mouse",
        pointerDistance: 120,
        clientDurationMs: 5_000,
      })
      .expect(400);
    expect(res.body.code).toBe("TOO_FAST");
  });

  it("rejects a too-short pointer movement with 400 MOVEMENT_TOO_SHORT", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);
    vi.setSystemTime(Date.now() + 500);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.direction,
        inputType: "touch",
        pointerDistance: 3,
      })
      .expect(400);
    expect(res.body.code).toBe("MOVEMENT_TOO_SHORT");
  });

  it("rejects a reused token", async () => {
    const app = buildApp();
    const token = await solveChallenge(app);

    await request(app).post("/login").send({ guardToken: token }).expect(200);

    const res = await request(app).post("/login").send({ guardToken: token }).expect(401);
    expect(["TOKEN_INVALID", "TOKEN_NOT_FOUND", "TOKEN_ALREADY_USED"]).toContain(res.body.code);
  });

  it("rejects a tampered token signature with 401", async () => {
    const app = buildApp();
    const token = await solveChallenge(app);
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "A" ? "B" : "A");

    const res = await request(app).post("/login").send({ guardToken: tampered }).expect(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("rejects a missing token with 401", async () => {
    const app = buildApp();
    const res = await request(app).post("/login").send({ email: "a@b.co" }).expect(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("rejects an action mismatch with 403 ACTION_MISMATCH", async () => {
    const app = buildApp();
    const token = await solveChallenge(app); // issued for "login"

    const res = await request(app).post("/comment").send({ guardToken: token }).expect(403);
    expect(res.body.code).toBe("ACTION_MISMATCH");
  });

  it("rejects unsupported modes with 400 UNSUPPORTED_MODE", async () => {
    const app = buildApp();
    const res = await request(app).get("/guard/challenge?mode=anything-else").expect(400);
    expect(res.body.code).toBe("UNSUPPORTED_MODE");
  });

  it("rejects a malformed verify body with 400 INVALID_REQUEST", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/guard/verify")
      .send({ challengeId: "x", direction: "sideways", inputType: "mouse" })
      .expect(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });

  it("never leaks the secret or expected direction in error responses", async () => {
    const app = buildApp();
    const challenge = await getChallenge(app);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: otherDirection(challenge.direction),
        inputType: "mouse",
        pointerDistance: 120,
      });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain("expectedDirection");
  });
});

describe("express adapter — direction-match (v0.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  interface MatchChallengeBody {
    challengeId: string;
    mode: string;
    targetDirection: Direction;
    initialDirection: Direction;
    expiresAt: number;
  }

  function buildMatchApp(onRiskDecision?: (assessment: RiskAssessment) => void) {
    const app = express();
    app.use(express.json());
    const store = new MemoryStore();
    app.use(
      "/guard",
      createGuardRoutes({ store, secret: SECRET, difficulty: "easy", action: "login", onRiskDecision })
    );
    app.post("/login", requireGuardToken({ store, secret: SECRET, action: "login" }), (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  type MatchApp = ReturnType<typeof buildMatchApp>;

  async function getMatchChallenge(app: MatchApp): Promise<MatchChallengeBody> {
    const res = await request(app).get("/guard/challenge?mode=direction-match").expect(200);
    return res.body as MatchChallengeBody;
  }

  function honestSignals(challenge: MatchChallengeBody) {
    const steps = ringDistance(challenge.initialDirection, challenge.targetDirection);
    return { rotateCount: steps, eventCount: steps + 1, directionChangeCount: 0 };
  }

  it("serves direction-match challenges with distinct target and initial directions", async () => {
    const app = buildMatchApp();
    const challenge = await getMatchChallenge(app);
    expect(challenge.mode).toBe("direction-match");
    expect(DIRECTIONS).toContain(challenge.targetDirection);
    expect(DIRECTIONS).toContain(challenge.initialDirection);
    expect(challenge.targetDirection).not.toBe(challenge.initialDirection);
  });

  it("keeps the default mode as v0.1 direction (backward compatibility)", async () => {
    const app = buildMatchApp();
    const res = await request(app).get("/guard/challenge").expect(200);
    expect(res.body.mode).toBe("direction");
    expect(res.body.direction).toBeDefined();
  });

  it("completes the full submit-time flow: challenge -> verify -> protected route", async () => {
    const app = buildMatchApp();
    const challenge = await getMatchChallenge(app);
    vi.setSystemTime(Date.now() + 2_000);

    const verify = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge),
        clientDurationMs: 1_900,
      })
      .expect(200);
    expect(verify.body.ok).toBe(true);

    await request(app).post("/login").send({ guardToken: verify.body.token }).expect(200);

    // One-time: reuse fails.
    await request(app).post("/login").send({ guardToken: verify.body.token }).expect(401);
  });

  it("rejects a wrong final direction with 400 WRONG_DIRECTION", async () => {
    const app = buildMatchApp();
    const challenge = await getMatchChallenge(app);
    vi.setSystemTime(Date.now() + 2_000);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: rotateDirection(challenge.targetDirection, 1),
        inputType: "mouse",
        signals: honestSignals(challenge),
      })
      .expect(400);
    expect(res.body.code).toBe("WRONG_DIRECTION");
  });

  it("rejects too-fast solves with 400 TOO_FAST", async () => {
    const app = buildMatchApp();
    const challenge = await getMatchChallenge(app);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
        signals: honestSignals(challenge),
      })
      .expect(400);
    expect(res.body.code).toBe("TOO_FAST");
  });

  it("returns 409 CHALLENGE_AGAIN when signals are missing (risk decision)", async () => {
    const app = buildMatchApp();
    const challenge = await getMatchChallenge(app);
    vi.setSystemTime(Date.now() + 2_000);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
      })
      .expect(409);
    expect(res.body.code).toBe("CHALLENGE_AGAIN");

    // The challenge was invalidated; the same answer cannot be replayed.
    await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
      })
      .expect(404);
  });

  it("returns 403 RISK_DENIED when strong risk signals stack, without leaking reasons", async () => {
    const assessments: RiskAssessment[] = [];
    const app = buildMatchApp((assessment) => assessments.push(assessment));
    const challenge = await getMatchChallenge(app);
    // 500ms: above the 400ms hard minimum but near-min (+20), no signals (+40) => 60 => deny.
    vi.setSystemTime(Date.now() + 500);

    const res = await request(app)
      .post("/guard/verify")
      .send({
        challengeId: challenge.challengeId,
        direction: challenge.targetDirection,
        inputType: "mouse",
      })
      .expect(403);
    expect(res.body.code).toBe("RISK_DENIED");

    // Explainability stays server-side: the hook sees reasons, the client doesn't.
    expect(assessments).toHaveLength(1);
    expect(assessments[0]?.decision).toBe("deny");
    expect(assessments[0]?.reasons.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain("reasons");
  });

  it("still rejects unknown modes with 400 UNSUPPORTED_MODE", async () => {
    const app = buildMatchApp();
    const res = await request(app).get("/guard/challenge?mode=pattern").expect(400);
    expect(res.body.code).toBe("UNSUPPORTED_MODE");
  });
});

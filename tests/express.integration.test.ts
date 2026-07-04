import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Direction } from "../src/core/types";
import { createGuardRoutes, requireGuardToken } from "../src/express";
import { DIRECTIONS } from "../src/modes/direction/direction.constants";
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

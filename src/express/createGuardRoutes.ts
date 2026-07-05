import express from "express";
import type { NextFunction, Request, Response, Router } from "express";
import type { Difficulty } from "../core/types";
import type { GuardErrorCode } from "../core/errors";
import { errorMessages } from "../core/errors";
import { isDifficulty } from "../core/difficulty";
import { isDirection } from "../modes/direction/direction.utils";
import type { DirectionMatchClientSignals } from "../modes/direction-match/directionMatch.types";
import { createDirectionChallenge, createDirectionMatchChallenge } from "../server/createChallenge";
import type { RiskAssessment, RiskConfig } from "../server/risk/types";
import type { GuardVerifyRequest } from "../server/verifyResponse";
import { verifyGuardResponse } from "../server/verifyResponse";
import type { GuardStore } from "../stores/Store";

export interface CreateGuardRoutesOptions {
  store: GuardStore;
  secret: string;
  /** Server-authoritative difficulty. Default "easy". */
  difficulty?: Difficulty;
  /** Honour a valid `?difficulty` query param. Default false. */
  allowClientDifficulty?: boolean;
  /** If set, issued tokens are bound to this action. */
  action?: string;
  challengeTtlMs?: number;
  tokenTtlMs?: number;
  /** Rule-based risk scoring for direction-match verifications. */
  risk?: RiskConfig;
  /**
   * Observability hook: called with the risk assessment of every
   * direction-match verification. Reasons are never sent to the client.
   */
  onRiskDecision?: (assessment: RiskAssessment) => void;
}

export function statusForCode(code: GuardErrorCode): number {
  switch (code) {
    case "CHALLENGE_NOT_FOUND":
      return 404;
    case "CHALLENGE_EXPIRED":
      return 410;
    case "TOKEN_INVALID":
    case "TOKEN_NOT_FOUND":
    case "TOKEN_EXPIRED":
    case "TOKEN_ALREADY_USED":
      return 401;
    case "ACTION_MISMATCH":
    case "RISK_DENIED":
      return 403;
    case "CHALLENGE_AGAIN":
      return 409;
    default:
      return 400;
  }
}

export function sendGuardError(res: Response, code: GuardErrorCode): void {
  res
    .status(statusForCode(code))
    .json({ ok: false, code, message: errorMessages[code] });
}

const INPUT_TYPES = ["mouse", "touch", "keyboard"] as const;

function parseVerifyRequest(body: unknown): GuardVerifyRequest | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.challengeId !== "string" ||
    candidate.challengeId.length === 0 ||
    candidate.challengeId.length > 256 ||
    !isDirection(candidate.direction) ||
    !(INPUT_TYPES as readonly unknown[]).includes(candidate.inputType)
  ) {
    return null;
  }
  const pointerDistance =
    typeof candidate.pointerDistance === "number" && Number.isFinite(candidate.pointerDistance)
      ? candidate.pointerDistance
      : undefined;
  const clientDurationMs =
    typeof candidate.clientDurationMs === "number" && Number.isFinite(candidate.clientDurationMs)
      ? candidate.clientDurationMs
      : undefined;
  // Signals pass through as-is: the server-side validator scores anomalies
  // instead of rejecting them at the HTTP layer.
  const signals =
    typeof candidate.signals === "object" &&
    candidate.signals !== null &&
    !Array.isArray(candidate.signals)
      ? (candidate.signals as DirectionMatchClientSignals)
      : undefined;
  return {
    challengeId: candidate.challengeId,
    direction: candidate.direction,
    inputType: candidate.inputType as GuardVerifyRequest["inputType"],
    ...(pointerDistance !== undefined ? { pointerDistance } : {}),
    ...(clientDurationMs !== undefined ? { clientDurationMs } : {}),
    ...(signals !== undefined ? { signals } : {}),
  };
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function wrap(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/**
 * Router with routes relative to its mount point: mounted at `/guard` it
 * serves `GET /guard/challenge` and `POST /guard/verify`.
 */
export function createGuardRoutes(options: CreateGuardRoutesOptions): Router {
  if (!options.secret) {
    throw new Error("form-human-guard: createGuardRoutes requires a non-empty `secret`");
  }
  const serverDifficulty = options.difficulty ?? "easy";
  const allowClientDifficulty = options.allowClientDifficulty ?? false;

  const router = express.Router();
  router.use(express.json());

  router.get(
    "/challenge",
    wrap(async (req, res) => {
      const mode = typeof req.query.mode === "string" ? req.query.mode : "direction";
      if (mode !== "direction" && mode !== "direction-match") {
        sendGuardError(res, "UNSUPPORTED_MODE");
        return;
      }

      let difficulty = serverDifficulty;
      if (
        allowClientDifficulty &&
        typeof req.query.difficulty === "string" &&
        isDifficulty(req.query.difficulty)
      ) {
        difficulty = req.query.difficulty;
      }

      const create =
        mode === "direction-match" ? createDirectionMatchChallenge : createDirectionChallenge;
      const challenge = await create({
        store: options.store,
        difficulty,
        challengeTtlMs: options.challengeTtlMs,
      });
      res.set("Cache-Control", "no-store");
      res.status(200).json(challenge);
    })
  );

  router.post(
    "/verify",
    wrap(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const response = parseVerifyRequest(req.body);
      if (!response) {
        sendGuardError(res, "INVALID_REQUEST");
        return;
      }

      const result = await verifyGuardResponse({
        store: options.store,
        secret: options.secret,
        response,
        action: options.action,
        tokenTtlMs: options.tokenTtlMs,
        risk: options.risk,
      });

      if (result.risk && options.onRiskDecision) {
        options.onRiskDecision(result.risk);
      }

      if (result.ok) {
        res.status(200).json({ ok: true, token: result.token });
        return;
      }
      sendGuardError(res, result.code);
    })
  );

  return router;
}

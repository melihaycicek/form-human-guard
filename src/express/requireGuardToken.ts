import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { GuardTokenPayload } from "../core/types";
import { verifyGuardToken } from "../server/verifyToken";
import type { GuardStore } from "../stores/Store";
import { sendGuardError } from "./createGuardRoutes";

export interface RequireGuardTokenOptions {
  store: GuardStore;
  secret: string;
  /** Body field holding the token. Default "guardToken". */
  tokenField?: string;
  /** If set, the token must have been issued for this action. */
  action?: string;
}

/** Request augmented by the middleware after successful verification. */
export interface GuardedRequest extends Request {
  guardToken?: GuardTokenPayload;
}

/**
 * Middleware that verifies AND consumes a one-time guard token from the JSON
 * request body (requires `express.json()` upstream). On success the decoded
 * payload is attached as `req.guardToken`; a reused token always fails.
 */
export function requireGuardToken(options: RequireGuardTokenOptions): RequestHandler {
  if (!options.secret) {
    throw new Error("form-human-guard: requireGuardToken requires a non-empty `secret`");
  }
  const tokenField = options.tokenField ?? "guardToken";

  return (req: Request, res: Response, next: NextFunction) => {
    const body: unknown = req.body;
    const token =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)[tokenField]
        : undefined;

    if (typeof token !== "string" || token.length === 0) {
      sendGuardError(res, "TOKEN_INVALID");
      return;
    }

    verifyGuardToken({
      store: options.store,
      secret: options.secret,
      token,
      action: options.action,
    })
      .then((result) => {
        if (!result.ok) {
          sendGuardError(res, result.code);
          return;
        }
        (req as GuardedRequest).guardToken = result.payload;
        next();
      })
      .catch(next);
  };
}

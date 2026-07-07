import { errorMessages } from "form-human-guard";
import type { GuardErrorCode } from "form-human-guard";

/** Mirror of the package's HTTP status mapping (see /docs/error-codes). */
const statusByCode: Record<GuardErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNSUPPORTED_MODE: 400,
  WRONG_DIRECTION: 400,
  TOO_FAST: 400,
  TOO_SLOW: 400,
  MOVEMENT_TOO_SHORT: 400,
  TOKEN_INVALID: 401,
  TOKEN_NOT_FOUND: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_ALREADY_USED: 401,
  ACTION_MISMATCH: 403,
  RISK_DENIED: 403,
  CHALLENGE_NOT_FOUND: 404,
  CHALLENGE_AGAIN: 409,
  CHALLENGE_EXPIRED: 410,
};

const NO_STORE = { "Cache-Control": "no-store" };

export function guardErrorResponse(code: GuardErrorCode): Response {
  return Response.json(
    { ok: false, code, message: errorMessages[code] },
    { status: statusByCode[code], headers: NO_STORE }
  );
}

export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** 503 for production deployments missing the shared Redis store. */
export function storeUnavailableResponse(): Response {
  return jsonNoStore(
    {
      ok: false,
      code: "DEMO_STORE_UNAVAILABLE",
      message:
        "The demo store is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    },
    503
  );
}

export function rateLimitedResponse(): Response {
  return jsonNoStore(
    {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many requests — please slow down and try again in a minute.",
    },
    429
  );
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

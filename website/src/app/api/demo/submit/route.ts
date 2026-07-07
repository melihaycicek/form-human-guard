import type { NextRequest } from "next/server";
import { verifyGuardToken } from "form-human-guard/server";
import {
  clientIp,
  guardErrorResponse,
  jsonNoStore,
  rateLimitedResponse,
  storeUnavailableResponse,
} from "@/lib/guard-http";
import { getGuardSecret, getGuardStore, isStoreUsable } from "@/lib/guard-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The "protected endpoint" of the live demo. It verifies AND consumes the
 * one-time token — submitting the same token twice fails with 401
 * TOKEN_NOT_FOUND, which the demo intentionally lets you try.
 */
export async function POST(request: NextRequest) {
  if (!isStoreUsable()) {
    return storeUnavailableResponse();
  }
  if (!(await checkRateLimit("demo-submit", clientIp(request), 30, 60))) {
    return rateLimitedResponse();
  }

  let guardToken: unknown;
  try {
    ({ guardToken } = (await request.json()) as { guardToken?: unknown });
  } catch {
    return guardErrorResponse("INVALID_REQUEST");
  }
  if (typeof guardToken !== "string") {
    return guardErrorResponse("TOKEN_INVALID");
  }

  const result = await verifyGuardToken({
    store: getGuardStore(),
    secret: getGuardSecret(),
    token: guardToken,
    action: "demo",
  });

  if (!result.ok) {
    return guardErrorResponse(result.code);
  }
  return jsonNoStore({
    ok: true,
    consumed: true,
    payload: {
      mode: result.payload.mode,
      action: result.payload.action,
      issuedAt: result.payload.issuedAt,
      expiresAt: result.payload.expiresAt,
    },
  });
}

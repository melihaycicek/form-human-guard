import type { NextRequest } from "next/server";
import { verifyGuardResponse } from "form-human-guard/server";
import type { GuardVerifyRequest } from "form-human-guard/server";
import { isGuardAction } from "@/lib/guard-actions";
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;
  if (!isGuardAction(action)) {
    return guardErrorResponse("INVALID_REQUEST");
  }
  if (!isStoreUsable()) {
    return storeUnavailableResponse();
  }
  if (!(await checkRateLimit("verify", clientIp(request), 30, 60))) {
    return rateLimitedResponse();
  }

  let body: GuardVerifyRequest;
  try {
    body = (await request.json()) as GuardVerifyRequest;
  } catch {
    return guardErrorResponse("INVALID_REQUEST");
  }

  const result = await verifyGuardResponse({
    store: getGuardStore(),
    secret: getGuardSecret(),
    response: body,
    action,
  });

  // Risk reasons are server-side observability — never sent to the client.
  if (result.risk && result.risk.decision !== "allow") {
    console.warn("guard risk decision", {
      action,
      score: result.risk.score,
      decision: result.risk.decision,
      reasons: result.risk.reasons,
    });
  }

  if (!result.ok) {
    return guardErrorResponse(result.code);
  }
  return jsonNoStore({ ok: true, token: result.token });
}

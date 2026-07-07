import type { NextRequest } from "next/server";
import { isDifficulty } from "form-human-guard";
import {
  createDirectionChallenge,
  createDirectionMatchChallenge,
} from "form-human-guard/server";
import { isGuardAction } from "@/lib/guard-actions";
import {
  clientIp,
  guardErrorResponse,
  jsonNoStore,
  rateLimitedResponse,
  storeUnavailableResponse,
} from "@/lib/guard-http";
import { getGuardStore, isStoreUsable } from "@/lib/guard-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
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
  if (!(await checkRateLimit("challenge", clientIp(request), 30, 60))) {
    return rateLimitedResponse();
  }

  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") ?? "direction";
  // The difficulty selector in the live demo is honoured here — an explicit
  // opt-in, mirroring the package's `allowClientDifficulty`. The other
  // actions always use the server default.
  const rawDifficulty = params.get("difficulty");
  const difficulty =
    action === "demo" && rawDifficulty && isDifficulty(rawDifficulty)
      ? rawDifficulty
      : "easy";

  const store = getGuardStore();

  if (mode === "direction") {
    const challenge = await createDirectionChallenge({ store, difficulty });
    return jsonNoStore(challenge);
  }
  if (mode === "direction-match") {
    const challenge = await createDirectionMatchChallenge({ store, difficulty });
    return jsonNoStore(challenge);
  }
  return guardErrorResponse("UNSUPPORTED_MODE");
}

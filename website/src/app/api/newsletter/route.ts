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
import { addNewsletterSubscriber, EMAIL_PATTERN } from "@/lib/subscriber-store";

export const dynamic = "force-dynamic";

interface NewsletterBody {
  email?: unknown;
  consent?: unknown;
  guardToken?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isStoreUsable()) {
    return storeUnavailableResponse();
  }
  if (!(await checkRateLimit("newsletter", clientIp(request), 10, 60))) {
    return rateLimitedResponse();
  }

  let body: NewsletterBody;
  try {
    body = (await request.json()) as NewsletterBody;
  } catch {
    return jsonNoStore({ ok: false, code: "INVALID_BODY" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return jsonNoStore({ ok: false, code: "INVALID_EMAIL" }, 400);
  }
  if (body.consent !== true) {
    return jsonNoStore({ ok: false, code: "CONSENT_REQUIRED" }, 400);
  }
  if (typeof body.guardToken !== "string") {
    return guardErrorResponse("TOKEN_INVALID");
  }

  // Verify and consume the one-time token. Tokens issued for any other
  // action (e.g. the demo) fail here with ACTION_MISMATCH.
  const result = await verifyGuardToken({
    store: getGuardStore(),
    secret: getGuardSecret(),
    token: body.guardToken,
    action: "newsletter",
  });
  if (!result.ok) {
    return guardErrorResponse(result.code);
  }

  await addNewsletterSubscriber(email);
  return jsonNoStore({ ok: true });
}

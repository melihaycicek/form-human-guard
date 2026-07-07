import type { NextRequest } from "next/server";
import { verifyGuardToken } from "form-human-guard/server";
import { locales } from "@/i18n/routing";
import {
  clientIp,
  guardErrorResponse,
  jsonNoStore,
  rateLimitedResponse,
  storeUnavailableResponse,
} from "@/lib/guard-http";
import { getGuardSecret, getGuardStore, isStoreUsable } from "@/lib/guard-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { addWaitlistEntry, EMAIL_PATTERN } from "@/lib/subscriber-store";

export const dynamic = "force-dynamic";

const TIERS = ["pro", "enterprise", "curious"] as const;
type Tier = (typeof TIERS)[number];

interface WaitlistBody {
  email?: unknown;
  tier?: unknown;
  note?: unknown;
  locale?: unknown;
  guardToken?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isStoreUsable()) {
    return storeUnavailableResponse();
  }
  if (!(await checkRateLimit("waitlist", clientIp(request), 10, 60))) {
    return rateLimitedResponse();
  }

  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return jsonNoStore({ ok: false, code: "INVALID_BODY" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return jsonNoStore({ ok: false, code: "INVALID_EMAIL" }, 400);
  }
  const tier =
    typeof body.tier === "string" && (TIERS as readonly string[]).includes(body.tier)
      ? (body.tier as Tier)
      : null;
  if (!tier) {
    return jsonNoStore({ ok: false, code: "INVALID_TIER" }, 400);
  }
  const note =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim().slice(0, 200)
      : undefined;
  const locale =
    typeof body.locale === "string" &&
    (locales as readonly string[]).includes(body.locale)
      ? body.locale
      : "en";
  if (typeof body.guardToken !== "string") {
    return guardErrorResponse("TOKEN_INVALID");
  }

  // One-time token bound to the "waitlist" action — dogfooding on the page
  // that matters most.
  const result = await verifyGuardToken({
    store: getGuardStore(),
    secret: getGuardSecret(),
    token: body.guardToken,
    action: "waitlist",
  });
  if (!result.ok) {
    return guardErrorResponse(result.code);
  }

  await addWaitlistEntry({
    email,
    tier,
    note,
    locale,
    createdAt: new Date().toISOString(),
  });
  return jsonNoStore({ ok: true });
}

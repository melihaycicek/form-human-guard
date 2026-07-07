import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/guard-http";
import { getWaitlistStats } from "@/lib/subscriber-store";

export const dynamic = "force-dynamic";

/**
 * Non-public demand check for the site owner: counts only, never emails.
 * Requires ?key= to match the ADMIN_KEY env var; disabled when unset.
 */
export async function GET(request: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  const provided = request.nextUrl.searchParams.get("key");
  if (!adminKey || provided !== adminKey) {
    return jsonNoStore({ ok: false, code: "FORBIDDEN" }, 403);
  }
  const stats = await getWaitlistStats();
  return jsonNoStore({ ok: true, ...stats });
}

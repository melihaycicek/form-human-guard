import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { hasSharedStore } from "./guard-store";

const limiters = new Map<string, Ratelimit>();

// Dev fallback: fixed-window counters in process memory. Fine for `next dev`,
// never used on Vercel when Redis is configured.
const memoryHits = new Map<string, { count: number; resetAt: number }>();

function getLimiter(bucket: string, limit: number, windowSec: number): Ratelimit {
  const key = `${bucket}:${limit}:${windowSec}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `fhg-site:rl:${bucket}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/** Returns true when the request is allowed, false when rate limited. */
export async function checkRateLimit(
  bucket: string,
  ip: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  if (hasSharedStore()) {
    const { success } = await getLimiter(bucket, limit, windowSec).limit(ip);
    return success;
  }

  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

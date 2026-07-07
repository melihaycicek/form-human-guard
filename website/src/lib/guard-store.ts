import { MemoryStore, RedisStore } from "form-human-guard/stores";
import type { GuardStore } from "form-human-guard/stores";
import { Redis } from "@upstash/redis";

// RedisStore expects an ioredis-style client: set(key, value, "PX", ttlMs).
// @upstash/redis uses set(key, value, { px }). Bridge with a tiny adapter.
function upstashAdapter(redis: Redis) {
  return {
    get: async (key: string) => {
      const v = await redis.get<string>(key);
      return v === null ? null : typeof v === "string" ? v : JSON.stringify(v);
    },
    set: (key: string, value: string, _px: "PX", ttlMs: number) =>
      redis.set(key, value, { px: ttlMs }),
    del: (key: string) => redis.del(key),
  };
}

export function hasSharedStore(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * On serverless (Vercel) every Route Handler invocation may hit a different
 * instance: challenges/tokens in a MemoryStore are not shared and
 * verification WILL fail across instances. Redis is required in production;
 * MemoryStore is only acceptable in local `next dev` (single process).
 */
export function isStoreUsable(): boolean {
  return hasSharedStore() || !process.env.VERCEL;
}

let store: GuardStore | null = null;

export function getGuardStore(): GuardStore {
  if (store) return store;
  if (hasSharedStore()) {
    store = new RedisStore({
      client: upstashAdapter(Redis.fromEnv()),
      keyPrefix: "fhg-site:",
    });
  } else {
    if (process.env.VERCEL) {
      console.warn(
        "form-human-guard demo: MemoryStore on serverless — verification WILL fail across instances. Set Upstash env vars."
      );
    }
    store = new MemoryStore();
  }
  return store;
}

export function getGuardSecret(): string {
  const secret = process.env.GUARD_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.VERCEL) {
    console.warn(
      "form-human-guard demo: GUARD_SECRET is missing or too short. Set a long random string in the environment."
    );
  }
  // Dev-only fallback so `next dev` works out of the box. Never rely on this
  // in production: tokens signed with it are forgeable by anyone.
  return "insecure-dev-secret-set-GUARD_SECRET";
}

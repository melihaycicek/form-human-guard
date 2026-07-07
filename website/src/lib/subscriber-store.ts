import { Redis } from "@upstash/redis";
import { hasSharedStore } from "./guard-store";

/**
 * Minimal storage for the newsletter and Exclusive-waitlist signups.
 * Redis sets in production; process memory in local dev. The lists are
 * write-only from the site — nothing ever exposes them publicly.
 */

const NEWSLETTER_KEY = "fhg-site:newsletter";
const WAITLIST_KEY = "fhg-site:waitlist";
const WAITLIST_TIERS_KEY = "fhg-site:waitlist:tiers";

export interface WaitlistEntry {
  email: string;
  tier: "pro" | "enterprise" | "curious";
  note?: string;
  locale: string;
  createdAt: string;
}

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!hasSharedStore()) return null;
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

// Dev fallbacks (single process only).
const devNewsletter = new Set<string>();
const devWaitlist = new Map<string, WaitlistEntry>();

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function addNewsletterSubscriber(email: string): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.sadd(NEWSLETTER_KEY, email);
  } else {
    devNewsletter.add(email);
  }
}

export async function addWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  const client = getRedis();
  if (client) {
    const added = await client.sadd(WAITLIST_KEY, JSON.stringify(entry));
    if (added > 0) {
      await client.hincrby(WAITLIST_TIERS_KEY, entry.tier, 1);
    }
  } else {
    if (!devWaitlist.has(entry.email)) {
      devWaitlist.set(entry.email, entry);
    }
  }
}

export interface WaitlistStats {
  waitlistTotal: number;
  tiers: Record<string, number>;
  newsletterTotal: number;
}

export async function getWaitlistStats(): Promise<WaitlistStats> {
  const client = getRedis();
  if (client) {
    const [waitlistTotal, tiers, newsletterTotal] = await Promise.all([
      client.scard(WAITLIST_KEY),
      client.hgetall<Record<string, number>>(WAITLIST_TIERS_KEY),
      client.scard(NEWSLETTER_KEY),
    ]);
    return { waitlistTotal, tiers: tiers ?? {}, newsletterTotal };
  }

  const tiers: Record<string, number> = {};
  for (const entry of devWaitlist.values()) {
    tiers[entry.tier] = (tiers[entry.tier] ?? 0) + 1;
  }
  return {
    waitlistTotal: devWaitlist.size,
    tiers,
    newsletterTotal: devNewsletter.size,
  };
}

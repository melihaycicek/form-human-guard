import type { StoredChallenge, StoredToken } from "../core/types";
import type { GuardStore } from "./Store";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Sweep expired entries once every this many store operations. */
const CLEANUP_EVERY_OPS = 200;

/**
 * In-memory store for development and single-instance deployments.
 * State lives in the process: it is lost on restart and NOT shared across
 * instances, so it is not suitable for multi-instance production use.
 */
export class MemoryStore implements GuardStore {
  private readonly challenges = new Map<string, Entry<StoredChallenge>>();
  private readonly tokens = new Map<string, Entry<StoredToken>>();
  private opCount = 0;

  async setChallenge(id: string, value: StoredChallenge, ttlMs: number): Promise<void> {
    this.set(this.challenges, id, value, ttlMs);
  }

  async getChallenge(id: string): Promise<StoredChallenge | null> {
    return this.get(this.challenges, id);
  }

  async deleteChallenge(id: string): Promise<void> {
    this.challenges.delete(id);
  }

  async setToken(id: string, value: StoredToken, ttlMs: number): Promise<void> {
    this.set(this.tokens, id, value, ttlMs);
  }

  async getToken(id: string): Promise<StoredToken | null> {
    return this.get(this.tokens, id);
  }

  async deleteToken(id: string): Promise<void> {
    this.tokens.delete(id);
  }

  private set<T>(map: Map<string, Entry<T>>, id: string, value: T, ttlMs: number): void {
    map.set(id, { value, expiresAt: Date.now() + ttlMs });
    this.maybeCleanup();
  }

  private get<T>(map: Map<string, Entry<T>>, id: string): T | null {
    const entry = map.get(id);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      map.delete(id);
      return null;
    }
    return entry.value;
  }

  /** Opportunistic sweep so abandoned entries don't accumulate forever. */
  private maybeCleanup(): void {
    this.opCount += 1;
    if (this.opCount < CLEANUP_EVERY_OPS) {
      return;
    }
    this.opCount = 0;
    const now = Date.now();
    for (const [id, entry] of this.challenges) {
      if (now > entry.expiresAt) {
        this.challenges.delete(id);
      }
    }
    for (const [id, entry] of this.tokens) {
      if (now > entry.expiresAt) {
        this.tokens.delete(id);
      }
    }
  }
}

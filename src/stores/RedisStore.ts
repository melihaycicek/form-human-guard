import type { StoredChallenge, StoredToken } from "../core/types";
import type { GuardStore } from "./Store";

/**
 * The minimal Redis surface this store needs. It matches ioredis directly;
 * for node-redis v4 wrap the client in a 3-line adapter (see README).
 * Redis is NOT a dependency of this package — you inject a connected client.
 */
export interface RedisStoreClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, pxKeyword: "PX", ttlMs: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface RedisStoreOptions {
  client: RedisStoreClient;
  /** Prefix for all keys. Default "fhg:". */
  keyPrefix?: string;
}

/**
 * Redis-backed store for production and multi-instance deployments.
 * Challenges and tokens are stored as JSON with native Redis TTLs (`PX`),
 * so expiry and cleanup are handled by Redis itself. Attempt updates re-SET
 * the challenge with its remaining TTL; consume semantics are DELs, which
 * preserves the one-time token guarantee across instances.
 */
export class RedisStore implements GuardStore {
  private readonly client: RedisStoreClient;
  private readonly keyPrefix: string;

  constructor(options: RedisStoreOptions) {
    if (!options || !options.client) {
      throw new Error("form-human-guard: RedisStore requires a `client`");
    }
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "fhg:";
  }

  async setChallenge(id: string, value: StoredChallenge, ttlMs: number): Promise<void> {
    await this.set(this.challengeKey(id), value, ttlMs);
  }

  async getChallenge(id: string): Promise<StoredChallenge | null> {
    return this.get<StoredChallenge>(this.challengeKey(id));
  }

  async deleteChallenge(id: string): Promise<void> {
    await this.client.del(this.challengeKey(id));
  }

  async setToken(id: string, value: StoredToken, ttlMs: number): Promise<void> {
    await this.set(this.tokenKey(id), value, ttlMs);
  }

  async getToken(id: string): Promise<StoredToken | null> {
    return this.get<StoredToken>(this.tokenKey(id));
  }

  async deleteToken(id: string): Promise<void> {
    await this.client.del(this.tokenKey(id));
  }

  private challengeKey(id: string): string {
    return `${this.keyPrefix}challenge:${id}`;
  }

  private tokenKey(id: string): string {
    return `${this.keyPrefix}token:${id}`;
  }

  private async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const ttl = Math.max(1, Math.ceil(ttlMs));
    await this.client.set(key, JSON.stringify(value), "PX", ttl);
  }

  private async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      // A corrupted record is treated as absent rather than throwing into
      // the verification path.
      await this.client.del(key);
      return null;
    }
  }
}

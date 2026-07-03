import type { StoredChallenge, StoredToken } from "../core/types";

/**
 * Pluggable persistence for challenges and one-time tokens. Implementations
 * must expire entries after `ttlMs` and treat expired entries as absent.
 */
export interface GuardStore {
  setChallenge(id: string, value: StoredChallenge, ttlMs: number): Promise<void>;
  getChallenge(id: string): Promise<StoredChallenge | null>;
  deleteChallenge(id: string): Promise<void>;

  setToken(id: string, value: StoredToken, ttlMs: number): Promise<void>;
  getToken(id: string): Promise<StoredToken | null>;
  deleteToken(id: string): Promise<void>;
}

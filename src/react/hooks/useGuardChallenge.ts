import { useCallback, useEffect, useState } from "react";
import type { Difficulty } from "../../core/types";
import type { PublicDirectionChallenge } from "../../modes/direction/direction.types";

export interface UseGuardChallengeOptions {
  endpoint: string;
  /** Sent as a hint; the server decides whether to honour it. */
  difficulty: Difficulty;
}

export interface UseGuardChallengeResult {
  challenge: PublicDirectionChallenge | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/** Fetch a direction challenge on mount and whenever `refresh` is called. */
export function useGuardChallenge({
  endpoint,
  difficulty,
}: UseGuardChallengeOptions): UseGuardChallengeResult {
  const [challenge, setChallenge] = useState<PublicDirectionChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${endpoint}/challenge?mode=direction&difficulty=${encodeURIComponent(difficulty)}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Challenge request failed with status ${res.status}`);
        }
        return res.json() as Promise<PublicDirectionChallenge>;
      })
      .then((data) => {
        if (!cancelled) {
          setChallenge(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setChallenge(null);
          setLoading(false);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, difficulty, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { challenge, loading, error, refresh };
}

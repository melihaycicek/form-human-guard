"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

export type ConsentValue = "all" | "necessary";

interface ConsentContextValue {
  /** null = undecided (banner visible). */
  consent: ConsentValue | null;
  setConsent: (value: ConsentValue) => void;
  /** Reopen the banner from the footer link. */
  reopen: () => void;
  bannerOpen: boolean;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

const COOKIE_NAME = "fhg-consent";
const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 182;

// The cookie is the external store; a tiny listener set lets
// useSyncExternalStore re-read it when we write.
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readCookie(): ConsentValue | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  return value === "all" || value === "necessary" ? value : null;
}

function writeCookie(value: ConsentValue) {
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${SIX_MONTHS_SECONDS}; Path=/; SameSite=Lax`;
  for (const listener of listeners) listener();
}

const emptySubscribe = () => () => {};

export function ConsentProvider({ children }: { children: ReactNode }) {
  // false during SSR/hydration, true after — keeps the banner out of the
  // server HTML so consented visitors never see it flash.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const consent = useSyncExternalStore(subscribe, readCookie, () => null);
  const [reopened, setReopened] = useState(false);

  const setConsent = useCallback((value: ConsentValue) => {
    writeCookie(value);
    setReopened(false);
  }, []);

  const reopen = useCallback(() => setReopened(true), []);

  const bannerOpen = hydrated && (reopened || consent === null);

  return (
    <ConsentContext.Provider value={{ consent, setConsent, reopen, bannerOpen }}>
      {children}
    </ConsentContext.Provider>
  );
}

/**
 * v1 ships no analytics, so consent gates nothing yet — but any future
 * analytics script must mount conditionally on `consent === "all"`.
 */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used inside ConsentProvider");
  return ctx;
}

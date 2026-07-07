/**
 * Every guard endpoint on this site is bound to one of these actions. A
 * token issued for the visible demo can never be spent on the newsletter or
 * waitlist endpoints — the mismatch fails with ACTION_MISMATCH (403).
 */
export const GUARD_ACTIONS = ["demo", "newsletter", "waitlist"] as const;

export type GuardAction = (typeof GUARD_ACTIONS)[number];

export function isGuardAction(value: string): value is GuardAction {
  return (GUARD_ACTIONS as readonly string[]).includes(value);
}

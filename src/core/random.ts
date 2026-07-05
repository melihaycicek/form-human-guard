import { randomBytes, randomInt } from "node:crypto";

/** Cryptographically random URL-safe identifier. Server-side only. */
export function randomId(byteLength = 16): string {
  return randomBytes(byteLength).toString("base64url");
}

/** Cryptographically random integer in [0, maxExclusive). Server-side only. */
export function randomIntBelow(maxExclusive: number): number {
  return randomInt(maxExclusive);
}

/** Cryptographically random element pick. Server-side only. */
export function randomPick<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("randomPick: cannot pick from an empty array");
  }
  return items[randomInt(items.length)] as T;
}

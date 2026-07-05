/**
 * Validation/normalization of client-reported interaction signals for the
 * direction-match flow. Signals are lightweight counters only (no
 * coordinates, no fingerprinting) and are always treated as untrusted:
 * anomalies found here feed the rule-based risk scoring, they are never a
 * hard rejection on their own.
 */

export type SignalAnomaly =
  | "SIGNALS_MISSING"
  | "SIGNALS_MALFORMED"
  | "SIGNALS_OUT_OF_RANGE"
  | "SIGNALS_INCONSISTENT";

export interface NormalizedDirectionMatchSignals {
  /** Whether the client sent a signals object at all. */
  present: boolean;
  rotateCount: number | null;
  eventCount: number | null;
  directionChangeCount: number | null;
}

export interface SignalValidationResult {
  signals: NormalizedDirectionMatchSignals;
  anomalies: SignalAnomaly[];
}

/** Counters above this are treated as out of range (automation loops). */
const MAX_COUNTER = 10_000;

function normalizeCounter(value: unknown): { value: number | null; anomaly: SignalAnomaly | null } {
  if (value === undefined) {
    return { value: null, anomaly: "SIGNALS_MALFORMED" };
  }
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { value: null, anomaly: "SIGNALS_MALFORMED" };
  }
  if (value < 0 || value > MAX_COUNTER) {
    return { value: null, anomaly: "SIGNALS_OUT_OF_RANGE" };
  }
  return { value, anomaly: null };
}

/** Deterministic, side-effect-free validation of raw client signals. */
export function validateDirectionMatchSignals(raw: unknown): SignalValidationResult {
  const anomalies = new Set<SignalAnomaly>();

  if (raw === undefined || raw === null) {
    return {
      signals: { present: false, rotateCount: null, eventCount: null, directionChangeCount: null },
      anomalies: ["SIGNALS_MISSING"],
    };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      signals: { present: false, rotateCount: null, eventCount: null, directionChangeCount: null },
      anomalies: ["SIGNALS_MALFORMED"],
    };
  }

  const candidate = raw as Record<string, unknown>;
  const rotate = normalizeCounter(candidate.rotateCount);
  const events = normalizeCounter(candidate.eventCount);
  const changes = normalizeCounter(candidate.directionChangeCount);
  for (const { anomaly } of [rotate, events, changes]) {
    if (anomaly) {
      anomalies.add(anomaly);
    }
  }

  // Every rotation step is an input event, and a rotation direction change
  // requires at least one rotation in each direction.
  if (rotate.value !== null && events.value !== null && events.value < rotate.value) {
    anomalies.add("SIGNALS_INCONSISTENT");
  }
  if (rotate.value !== null && changes.value !== null && changes.value > rotate.value) {
    anomalies.add("SIGNALS_INCONSISTENT");
  }

  return {
    signals: {
      present: true,
      rotateCount: rotate.value,
      eventCount: events.value,
      directionChangeCount: changes.value,
    },
    anomalies: [...anomalies],
  };
}

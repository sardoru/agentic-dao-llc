import { type Hex, keccak256, stringToBytes } from "viem";

/**
 * Canonical hash of a simulatable action. The sim-gate keys on this so a write can
 * only proceed if THIS EXACT action was simulated successfully first — enforced with
 * a hash, not trust (build spec §11b). bigints are serialized as decimal strings;
 * addresses/selectors are lowercased so equal actions always hash equal.
 */
export function hashAction(action: unknown): Hex {
  return keccak256(stringToBytes(canonical(action)));
}

function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "string") return value.toLowerCase();
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = normalize((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Tracks which action hashes have a successful simulation, so a subsequent write for
 * that exact action is permitted exactly once. In-memory + single-use by default:
 * consuming a gate removes it, so a replayed write must re-simulate.
 */
export class SimulationGate {
  private readonly passed = new Map<Hex, number>();

  /** Record that an action simulated successfully. */
  record(action: unknown): Hex {
    const h = hashAction(action);
    this.passed.set(h, Date.now());
    return h;
  }

  /** True if this exact action has a recorded successful simulation. */
  has(action: unknown): boolean {
    return this.passed.has(hashAction(action));
  }

  /**
   * Consume the gate for an action: returns true iff it was present (and removes it,
   * so the same simulation cannot authorize two writes). Returns false if the action
   * was never simulated — the caller must then refuse to submit.
   */
  consume(action: unknown): boolean {
    const h = hashAction(action);
    if (!this.passed.has(h)) return false;
    this.passed.delete(h);
    return true;
  }

  clear(): void {
    this.passed.clear();
  }
}

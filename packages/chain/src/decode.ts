import { type Abi, type Address, type Hex, decodeFunctionData, size, slice } from "viem";

/** The decoded shape of a single call, used to build a policy `ProposedAction`. */
export interface DecodedCall {
  target: Address;
  /** 4-byte function selector (lowercased). */
  selector: Hex;
  /** Native value attached to the call. */
  value: bigint;
  /** Raw calldata. */
  data: Hex;
  /** Resolved human-readable function name, if the call matched a known ABI. */
  functionName?: string;
  /** Decoded arguments, if the call matched a known ABI. */
  args?: readonly unknown[];
}

/**
 * Extract the leading 4-byte selector from calldata. Returns `0x` for empty
 * calldata (a bare value transfer). Always lowercased so it compares cleanly
 * against the reserved-selector set in the policy engine.
 */
export function selectorOf(data: Hex): Hex {
  if (!data || data === "0x" || size(data) < 4) return "0x";
  return slice(data, 0, 4).toLowerCase() as Hex;
}

/**
 * Decode a raw transaction `(to, data, value)` into the `{ target, selector, ... }`
 * shape the policy engine reasons over. If an `abi` is supplied and the calldata
 * matches a known function, the human-readable name + args are attached too; an
 * unknown selector is NOT an error (the policy engine still evaluates the raw
 * target+selector against the reserved set and the mandate allowlist).
 */
export function decodeTx(tx: { to: Address; data?: Hex; value?: bigint }, abi?: Abi): DecodedCall {
  const data = (tx.data ?? "0x") as Hex;
  const selector = selectorOf(data);
  const base: DecodedCall = {
    target: tx.to,
    selector,
    value: tx.value ?? 0n,
    data,
  };

  if (abi && selector !== "0x") {
    try {
      const { functionName, args } = decodeFunctionData({ abi, data });
      base.functionName = functionName;
      base.args = args as readonly unknown[];
    } catch {
      // Unknown selector for this ABI — leave name/args undefined; raw shape stands.
    }
  }
  return base;
}

/**
 * Decode a batch of calls (the (targets, values, calldatas) tuple a Governor
 * proposal carries) into the per-call shape. Mismatched array lengths throw —
 * a malformed proposal must never reach policy evaluation.
 */
export function decodeProposalCalls(
  targets: readonly Address[],
  values: readonly bigint[],
  calldatas: readonly Hex[],
  abi?: Abi,
): DecodedCall[] {
  if (targets.length !== values.length || targets.length !== calldatas.length) {
    throw new Error(
      `proposal arrays length mismatch: targets=${targets.length} values=${values.length} calldatas=${calldatas.length}`,
    );
  }
  return targets.map((target, i) =>
    decodeTx({ to: target, data: calldatas[i] as Hex, value: values[i] as bigint }, abi),
  );
}

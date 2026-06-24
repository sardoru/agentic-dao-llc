import type { Address, Hex } from "viem";
import type { EvalContext, Mandate, ProposedAction } from "@agentic-dao/policy";

/**
 * The raw EIP-1559 fields the caller supplies (nonce/gas come from the caller, not
 * the signer — the signer's only job is the policy re-check + the cryptographic
 * signature). `to`/`data`/`value` are the on-chain call; `action` is the SEMANTIC
 * action the policy engine reasons over (it cannot be re-derived from calldata, e.g.
 * a proposal's USD value / impact / type), so the caller must pass it.
 */
export interface BaseTxFields {
  to: Address;
  data?: Hex;
  value?: bigint;
  nonce: number;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  chainId: number;
}

/** A governance tx (propose / castVote) + the action that justifies it. */
export interface GovTxRequest extends BaseTxFields {
  action: Extract<ProposedAction, { kind: "propose" } | { kind: "castVote" }>;
}

/** A bounded operational tx (opExecute) + its action. */
export interface OpTxRequest extends BaseTxFields {
  action: Extract<ProposedAction, { kind: "opExecute" }>;
}

/** The non-spend context the signer needs to re-evaluate policy (simulation + clock + active). */
export type SignerContext = Omit<EvalContext, "epochSpend">;

/**
 * Policy-gated signer. The agent brain never holds the key; it requests a signature.
 * Every method re-runs `policy.evaluate()` INDEPENDENTLY and throws
 * {@link SignerPolicyError} on deny — it never trusts that the caller already checked
 * (build spec §8, defense in depth).
 */
export interface Signer {
  address(): Promise<Address>;
  signGovernanceTx(tx: GovTxRequest, mandate: Mandate, ctx: SignerContext): Promise<Hex>;
  signOpTx(tx: OpTxRequest, mandate: Mandate, epochSpend: bigint, ctx: SignerContext): Promise<Hex>;
}

export type { Mandate, ProposedAction, EvalContext };

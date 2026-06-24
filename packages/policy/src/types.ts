import type { Address, Hex } from "viem";

export type ProposalType = "TREASURY_PAYMENT" | "PARAM_TUNE_NONRESERVED" | "TEXT_SIGNAL";
export type Impact = "LOW" | "MED" | "HIGH";
export type RationaleStorage = "ipfs" | "arweave";

/** uint256 amounts are carried as decimal strings in the mandate doc (JSON-safe). */
export interface SpendingCap {
  token: Address;
  perTx: string;
  perEpoch: string;
  epochSeconds: number;
}

export interface MandateScope {
  canPropose: boolean;
  canVote: boolean;
  proposalTypes: ProposalType[];
  allowedTargets: Address[];
  /** Extra denied selectors layered on top of the reserved set. */
  forbiddenSelectors?: Hex[];
  /** null/absent ⇒ the agent has no bounded operational authority. */
  spendingCap?: SpendingCap | null;
}

export interface HumanRatification {
  valueUsdGte?: number;
  impact?: Impact[];
}

/**
 * Machine-readable policy bounding a delegated agent. Canonicalized + keccak256-hashed
 * to produce the `mandateHash` anchored on-chain in AgentRegistry (build spec §7.1).
 */
export interface Mandate {
  version: "1.0";
  agentId: string;
  principal: Address;
  agentAccount: Address;
  scope: MandateScope;
  votingPolicy?: string;
  humanRatification?: HumanRatification;
  requireSimulation: boolean;
  rationaleStorage: RationaleStorage;
  guardian: Address;
  createdAt: string;
  expiresAt: string;
}

/** A concrete action an agent wants to take, before it is allowed/denied. */
export type ProposedAction =
  | {
      kind: "propose";
      proposalType: ProposalType;
      targets: Address[];
      selectors: Hex[];
      values: bigint[];
      valueUsd?: number;
      impact?: Impact;
    }
  | { kind: "castVote"; proposalId: bigint; support: 0 | 1 | 2 }
  | {
      kind: "opExecute";
      target: Address;
      selector: Hex;
      value: bigint;
      token?: Address;
      amount?: bigint;
    };

export interface EvalContext {
  /** Did a successful simulation of this exact action already run? */
  simulated: boolean;
  /** Token units already spent by this agent in the current epoch. */
  epochSpend: bigint;
  /** Unix seconds. */
  now: number;
  /** On-chain AgentRegistry active flag; defaults to true when omitted. */
  mandateActive?: boolean;
}

export type DecisionRule =
  | "MANDATE_INACTIVE"
  | "MANDATE_EXPIRED"
  | "CAPABILITY_NOT_ALLOWED"
  | "PROPOSAL_TYPE_NOT_ALLOWED"
  | "TARGET_NOT_ALLOWED"
  | "FORBIDDEN_SELECTOR"
  | "RESERVED_MATTER"
  | "OP_TARGET_NOT_ALLOWED"
  | "NO_SPENDING_CAP"
  | "PER_TX_CAP_EXCEEDED"
  | "PER_EPOCH_CAP_EXCEEDED"
  | "SIMULATION_REQUIRED"
  | "NEEDS_HUMAN_RATIFICATION";

export type Decision =
  | { allow: true }
  | {
      allow: false;
      reason: string;
      rule: DecisionRule;
      /** When true, the runtime converts this into a draft-for-human path, not a hard error. */
      ratificationDraft?: boolean;
    };

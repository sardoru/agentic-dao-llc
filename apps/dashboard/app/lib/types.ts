export type ProposalState =
  | "Pending"
  | "Active"
  | "Canceled"
  | "Defeated"
  | "Succeeded"
  | "Queued"
  | "Expired"
  | "Executed";

export interface Agent {
  address: string;
  agentId: string;
  principal: string;
  principalName?: string;
  mandateHash: string;
  mandateURI: string;
  mandateHashMismatch: boolean;
  active: boolean;
  epochSpendUsd: number;
  epochCapUsd: number;
  proposalTypes: string[];
  canPropose: boolean;
  canVote: boolean;
}

export interface Member {
  address: string;
  name?: string;
  delegatedAgent: string | null;
  votingWeight: number;
  participationRate: number;
}

export interface Vote {
  voter: string;
  agentAddress: string;
  agentId: string;
  principal: string;
  support: 0 | 1 | 2;
  reason: string;
  weight: bigint;
  txHash: string;
}

export interface SimResult {
  success: boolean;
  gasUsed: bigint;
  revertReason?: string;
  assetChanges?: { token: string; delta: string; symbol: string }[];
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  state: ProposalState;
  proposerAgent: string;
  proposerAgentId: string;
  proposerPrincipal: string;
  proposerPrincipalName?: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  decodedCalls?: { target: string; fn: string; args: string }[];
  rationaleURI: string;
  rationaleHash: string;
  rationaleVerified?: boolean;
  simResult?: SimResult;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  quorumVotes: bigint;
  totalSupply: bigint;
  timelockEta?: number;
  createdAt: number;
  txHash: string;
  votes: Vote[];
}

export interface TreasuryBalance {
  token: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  valueUsd: number;
}

export interface TreasurySpend {
  id: string;
  token: string;
  symbol: string;
  amount: bigint;
  amountUsd: number;
  to: string;
  proposalId: string;
  executedAt: number;
  txHash: string;
}

export interface Treasury {
  balances: TreasuryBalance[];
  totalValueUsd: number;
  weeklyCapUsd: number;
  weeklySpentUsd: number;
  recentSpends: TreasurySpend[];
}

export interface TimelockOp {
  opId: string;
  proposalId: string;
  proposalTitle: string;
  eta: number;
  queuedAt: number;
  status: "Queued" | "Ready" | "Done" | "Canceled";
}

export interface DaoStats {
  memberCount: number;
  agentCount: number;
  activeProposals: number;
  quorumFraction: number;
  totalSupply: number;
  timelockDelay: number;
}

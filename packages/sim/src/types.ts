import type { Address, Hex } from "viem";

/** A transaction to dry-run. `from` defaults to the agent's signer when omitted. */
export interface TxRequest {
  from?: Address;
  to: Address;
  data?: Hex;
  value?: bigint;
  gas?: bigint;
}

/** A single asset balance delta produced by a simulated tx. */
export interface AssetDelta {
  /** Native (undefined) or ERC-20 token address. */
  token?: Address;
  /** Account whose balance changed. */
  account: Address;
  /** Signed change in the smallest unit, as a decimal string (JSON-safe). */
  delta: string;
  symbol?: string;
}

/** The uniform simulation result every Simulator returns. */
export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  revertReason?: string;
  assetChanges?: AssetDelta[];
  /** Which backend produced this result — surfaced on the dashboard. */
  backend: "tenderly" | "anvil-fork";
}

/**
 * A pre-submission dry-run. Every write path simulates first; the result is stored
 * with the rationale and shown on the dashboard, and the MCP/CLI refuse to submit a
 * write whose exact action was not simulated successfully (build spec §9, §11).
 */
export interface Simulator {
  simulate(tx: TxRequest): Promise<SimulationResult>;
  /** Identifies the backend for logging / dashboard display. */
  readonly backend: "tenderly" | "anvil-fork";
}
